(function($) {

$.klan = $.klan || {};
$.klan.app = $.klan.app || {};

$.klan.app.browser = function(element, options) {
	var defaults = {
		issue: '00',
		screen: 1,
		text: undefined,
		params: []
	}

	var $element = $(element);
	var element = element;
	var plugin = this;

	plugin.meta = {
		name: 'klan.app.browser',
		version: '3.0.0'
	}

	plugin.settings = {}
	plugin.cache = {}
	plugin.actual = {}
	plugin.wrappers = {}
	plugin.locks = {}
	plugin.flags = {}
	plugin.engine = {
		'ads': {},
		'buttons': {},
		'events': {},
		'ivars': {},
		'screen': null,
		'svars': {},
		'text': null
	}

	plugin.init = function() {
		plugin.settings = $.extend({}, defaults, options);

		if ($.query.get('debug')) {
			$('body').addClass('debug');
		}

		plugin.actual.issue = plugin.settings.issue;
		plugin.actual.screen = plugin.settings.screen;
		plugin.actual.text = plugin.settings.text;
		plugin.actual.params = plugin.settings.params;

		$.when.all([
			$.klan.api.issue.images(plugin.actual.issue),
			$.klan.api.issue.screens(plugin.actual.issue),
			$.klan.api.issue.texts(plugin.actual.issue)
		]).done(function(responses) {
			plugin.cache.images = responses[0].images;
			plugin.cache.screens = responses[1].screens;
			plugin.cache.texts = responses[2].texts;

			plugin.cache.texts_indexed = {}
			$.each(plugin.cache.texts, function(text_index, text) {
				plugin.cache.texts_indexed[text.name.replace('/', '\\')] = text_index;
			});

			crossroads.addRoute('/{issue}/{screen}/:text:/:params_raw:', function(issue, screen, text, params_raw) {
				plugin.actual.issue = issue;
				plugin.actual.screen = parseInt(screen);
				plugin.actual.text = (text && text != '-') ? text : undefined;
				plugin.actual.params_raw = params_raw ? params_raw.split('|') : [];

				if (plugin.actual.params_raw.length) {
					$.each(plugin.actual.params_raw, function(index_param_raw, item_param_raw) {
						var param_raw = item_param_raw.split(':');
						var param_raw_name = param_raw[0];
						var param_raw_value = param_raw[1];

						plugin.actual.params[param_raw_name] = param_raw_value;
					});

					if (plugin.actual.params.text) {
						plugin.actual.text = plugin.actual.params.text;
					}
				}

				screen_load();

	// 				log('crossroads: starting loop');
	// 				$(document).everyTime(5500, 'klan.app.browser.loop', function() {
	// 					log('* loop tick');
	// //					listing_render(); // TODO?
	// 				});
			});

			crossroads.addRoute('/{issue}', function(issue) {
				plugin.actual.issue = issue;
				plugin.actual.screen = 1;

				hasher.replaceHash(sprintf('%s/%s', plugin.actual.issue, plugin.actual.screen));
			});

			function hasher_init(hash_current) {
				if (hash_current == '') {
					hasher.replaceHash(plugin.actual.issue);
				}
				else {
					crossroads.parse(hash_current);
				}
			}

			function hasher_parse(hash_new, hash_old) {
				crossroads.parse(hash_new);
			}

			wrappers_prepare();
			screen_prepare();
			info_prepare();

			hasher.initialized.add(hasher_init);
			hasher.changed.add(hasher_parse);
			hasher.init();
		});
	}



// ******************************************* wrappers *******************************************
	var wrappers_prepare = function(callback) {
		if (locked('wrappers_prepare')) {
			return false;
		}

		lock('wrappers_prepare');

		$element.html(sprintf(
			'<div class="klan-app-browser klan-issue-%s clearfix">' +
				'<div class="wrapper-display"></div>' +
				'<div class="wrapper-info"></div>' +
				'<div class="wrapper-log"></div>' +
			'</div>',
			plugin.actual.issue
		));

		plugin.wrappers.display = $('.wrapper-display', $element);
		plugin.wrappers.info = $('.wrapper-info', $element);
		plugin.wrappers.log = $('.wrapper-log', $element);

		flag('wrappers', 'prepared');

		if (typeof callback === 'undefined') {
		}
		else {
			callback();
		}

		unlock('wrappers_prepare');
	}



	// ******************************************* screen *******************************************
	var screen_prepare = function(callback) {
		if (locked('screen_prepare')) {
			return false;
		}

		if (!flagged('wrappers', 'prepared')) {
			return false;
		}

		lock('screen_prepare');

		flag('screen', 'prepared');

		if (typeof callback === 'undefined') {
		}
		else {
			callback();
		}

		unlock('screen_prepare');
	}



	var screen_load = function() {
		log(' - - loading');

		$.when.all([
			$.klan.api.issue.screens(plugin.actual.issue, plugin.actual.screen)
		]).done(function(responses) {
			plugin.cache.screen = responses[0];

			if (plugin.cache.screen.type_1 == 0) {
				plugin.engine.events = {};
				plugin.engine.screen = null;
				plugin.engine.buttons = {};
				plugin.engine.ads = {};
				plugin.engine.text = null;
			}

			$.each(plugin.cache.screen.events, function(event_index, event) {
				plugin.engine.events[event.binding] = event.macros;
			});

			$.each(plugin.cache.screen.macros, function(macro_index, macro) {
				parse_macro(macro, macro_index);
			});
		});
	}



	var screen_render = function(force) {
		force = (typeof force === 'undefined') ? false : force;

		if (force) {
			log(' - - rendering');

			plugin.wrappers.display.empty();

			if (plugin.engine.screen) {
				plugin.wrappers.display.append(sprintf(
					'<div class="component screen" style="background-image:url(https://api.klan2016.cz/%s/images/0/%04d.png)"></div>',
					plugin.actual.issue,
					plugin.engine.screen.id
				));
			}

			if (plugin.engine.text) {
				plugin.wrappers.display.append(sprintf(
					'<div id="component-%s-text" class="component text" style="width:%spx;height:%spx;left:%spx;top:%spx;"><img src="https://api.klan2016.cz/%s/texts/0/%03d/0.png" /></div>',
					plugin.actual.screen,
					plugin.engine.text.area.width + 30,
					plugin.engine.text.area.height,
					plugin.engine.text.area.topleft_x,
					plugin.engine.text.area.topleft_y,
					plugin.actual.issue,
					plugin.engine.text.content.startsWith('^') ?
						plugin.cache.texts_indexed[plugin.engine.svars[plugin.engine.text.content.substr(1)]] :
						plugin.cache.texts_indexed[plugin.engine.text.content]
				));

				$(sprintf(
					'#component-%s-text',
					plugin.actual.screen
				))
				.mCustomScrollbar({
					scrollInertia: 0,
					snapAmount: 12,
					mouseWheel: {
						enable: true,
						scrollAmount: 24
					},
					scrollButtons: {
						enable: false,
						scrollAmount: 24
					},
					keyboard: {
						enable: true,
						scrollAmount: 24
					}
				});
			}

			$.each(plugin.engine.buttons, function(button_index, button) {
				var image = plugin.cache.images[button.image];

				plugin.wrappers.display.append(sprintf(
					'<div id="component-%s-%s" data-id="%s" class="component button" style="width:%spx;height:%spx;left:%spx;top:%spx;background-image:url(https://api.klan2016.cz/%s/images/0/%04d.png);"></div>',
					plugin.actual.screen,
					button.id,
					button.id,
					image.width,
					image.height,
					button.topleft_x,
					button.topleft_y,
					plugin.actual.issue,
					button.image
				));

				if (button.hover_topleft_x || button.hover_topleft_y || button.hover_bottomright_x || button.hover_bottomright_y) {
					plugin.wrappers.display.append(sprintf(
						'<div id="action-%s-%s" data-id="%s" class="action" style="width:%spx;height:%spx;left:%spx;top:%spx;"></div>',
						plugin.actual.screen,
						button.id,
						button.id,
						button.hover_bottomright_x - button.hover_topleft_x,
						button.hover_bottomright_y - button.hover_topleft_y,
						button.hover_topleft_x,
						button.hover_topleft_y
					));
				}
				else {
					plugin.wrappers.display.append(sprintf(
						'<div id="action-%s-%s" data-id="%s" class="action" style="width:%spx;height:%spx;left:%spx;top:%spx;"></div>',
						plugin.actual.screen,
						button.id,
						button.id,
						image.width,
						image.height,
						button.topleft_x,
						button.topleft_y
					));
				}
			});

			$.each(plugin.engine.ads, function(ad_index, ad) {
				var image = plugin.cache.images[ad.image];

				plugin.wrappers.display.append(sprintf(
					'<div id="component-%s-%s" class="component ad" style="width:%spx;height:%spx;left:%spx;top:%spx;background-image:url(https://api.klan2016.cz/%s/images/0/%04d.png);"></div>',
					plugin.actual.screen,
					ad.id,
					image.width,
					image.height,
					ad.topleft_x,
					ad.topleft_y,
					plugin.actual.issue,
					ad.image
				));

				plugin.wrappers.display.append(sprintf(
					'<div id="action-%s-%s" data-id="%s" class="action" style="width:%spx;height:%spx;left:%spx;top:%spx;"></div>',
					plugin.actual.screen,
					ad.id,
					ad.id,
					image.width,
					image.height,
					ad.topleft_x,
					ad.topleft_y
				));
			});
		}

		$('.action').click(function() {
			run_event($(this).data('id'));
			screen_render(true);

			return false;
		});
	}



	// ******************************************* info *******************************************
	var info_prepare = function() {
	}



	var info_render = function() {
		plugin.wrappers.info.empty();

		plugin.wrappers.info.append(sprintf(
			'<div>- ivars</div>'
		));
		$.each(plugin.engine.ivars, function(ivar_index, ivar) {
			plugin.wrappers.info.append(sprintf(
				'<div>ivar %s = %s</div>',
				ivar_index,
				ivar
			));
		});

		plugin.wrappers.info.append(sprintf(
			'<div>- svars</div>'
		));
		$.each(plugin.engine.svars, function(svar_index, svar) {
			plugin.wrappers.info.append(sprintf(
				'<div>svar %s = "%s"</div>',
				svar_index,
				svar
			));
		});

		plugin.wrappers.info.append(sprintf(
			'<div>- screen</div>'
		));
		plugin.wrappers.info.append(sprintf(
			'<div>screen = %s</div>',
			plugin.engine.screen ? plugin.engine.screen.id : 'null'
		));

		plugin.wrappers.info.append(sprintf(
			'<div>- text</div>'
		));
		plugin.wrappers.info.append(sprintf(
			'<div>text = %s</div>',
			plugin.engine.text ? plugin.engine.text.content : 'null'
		));
	}



	// ******************************************* logging *******************************************
	var log = function(string) {
		$.klan.log(sprintf('[%s] %s', plugin.meta.name, string));
		if (plugin.wrappers.log) {
			plugin.wrappers.log.prepend(sprintf('<div>- %s</div>', string));
		}
	}



	// ******************************************* locking *******************************************
	var lock = function(id) {
		plugin.locks[id] = true;
	}

	var unlock = function(id) {
		delete plugin.locks[id];
	}

	var locked = function(id) {
		return (typeof id === 'undefined') ?
			(plugin.locks.length ? true : false) :
			plugin.locks[id];
	}



	// ******************************************* flagging *******************************************
	var flag = function(id, flag) {
		if (typeof plugin.flags[id] === 'undefined') {
			plugin.flags[id] = {}
		}
		plugin.flags[id][flag] = true;
	}

	var unflag = function(id, flag) {
		if (typeof plugin.flags[id] === 'undefined') {
			plugin.flags[id] = {}
		}
		plugin.flags[id][flag] = false;
	}

	var flagged = function(id, flag) {
		return (typeof plugin.flags[id] === 'undefined' ?
			false :
			plugin.flags[id][flag]
		);
	}



	// ******************************************* helpers *******************************************
	var parse_macro = function(macro, macro_index) {
		log(sprintf('s: %s, m: %s, t: %s', plugin.actual.screen, macro_index, macro.type));

		if (macro.type == 'button') {
			if (macro.params.id < 32768) {
				plugin.engine.buttons[macro.params.id] = macro.params;
			}
		}

		if (macro.type == 'event') {
			run_event(macro.params.id);
		}

		if (macro.type == 'gotopage') {
			if (macro.params.id < 32768) {
				plugin.actual.screen = macro.params.id;
			}
			else {
				plugin.actual.screen = plugin.engine.ivars[65536 - macro.params.id];
			}
			screen_load();
		}

		if (macro.type == 'if') {
			var value_1 = null;
			var value_2 = null;
			var condition = null;

			if (macro.params.branches.branch_if.value_1 < 32768) {
				// TODO ???
			}
			else {
				value_1 = plugin.engine.ivars[65536 - macro.params.id]
			}

			value_2 = macro.params.branches.branch_if.value_2;

			if (macro.params.branches.branch_if.condition == 1) {
				condition = (value_1 == value_2);
			}

			if (condition) {
				$.each(macro.params.branches.branch_if.macros, function(branch_macro_index, branch_macro) {
					parse_macro(branch_macro, branch_macro_index);
				});
			}
			else if (macro.params.branches.branch_else) {
				$.each(macro.params.branches.branch_else.macros, function(branch_macro_index, branch_macro) {
					parse_macro(branch_macro, branch_macro_index);
				});
			}
		}

		if (macro.type == 'ivar/mov') {
			plugin.engine.ivars[macro.params.variable] = macro.params.value;
		}

		if (macro.type == 'keybutt') {
			// TODO
		}

		if (macro.type == 'reklama') {
			plugin.engine.ads[macro.params.id] = macro.params;
		}

		if (macro.type == 'screen') {
			plugin.engine.screen = macro.params;
		}

		if (macro.type == 'separator') {
			// PASS
		}

		if (macro.type == 'svar') {
			plugin.engine.svars[macro.params.variable] = macro.params.value;
		}

		if (macro.type == 'text') {
			plugin.engine.text = macro.params;
		}

		if (macro.type == 'woknoshit') {
			screen_render(true);
		}

		info_render();
	}



	var run_event = function(event_id) {
		log(sprintf(' - - event %s'), event_id);

		if (event_id) {
			$.each(plugin.engine.events[event_id], function(event_macro_index, event_macro) {
				parse_macro(event_macro, event_macro_index);
			});
		}
		else {
			alert('Exit to DOS :-)');
		}
	}


	plugin.init();
}



$.fn.klan_app_browser = function(options) {
	return this.each(function() {
		if (undefined === $(this).data('klan_app_browser')) {
			var plugin = new $.klan.app.browser(this, options);
			$(this).data('klan_app_browser', plugin);
		}
	});
}

})(jQuery);
