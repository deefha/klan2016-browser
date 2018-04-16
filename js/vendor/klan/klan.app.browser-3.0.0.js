(function($) {

$.klan = $.klan || {};
$.klan.app = $.klan.app || {};

$.klan.app.browser = function(element, options) {
	var defaults = {
		issue: '00'
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

			crossroads.addRoute('/{issue}', function(issue) {
				plugin.actual.issue = issue;
				plugin.actual.screen = 1;

				screen_load();

	// 				log('crossroads: starting loop');
	// 				$(document).everyTime(5500, 'klan.app.browser.loop', function() {
	// 					log('* loop tick');
	// //					listing_render(); // TODO?
	// 				});
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
		log(sprintf('loading s:%s', plugin.actual.screen), '>>');

		$.when.all([
			$.klan.api.issue.screens(plugin.actual.issue, plugin.actual.screen)
		]).done(function(responses) {
			plugin.cache.screen = responses[0];

			log(sprintf('loaded s:%s, type_1:%s', plugin.actual.screen, plugin.cache.screen.type_1));

			if (plugin.cache.screen.type_1 == 0) {
				plugin.engine.events = {};
				plugin.engine.screen = null;
				plugin.engine.buttons = {};
				plugin.engine.ads = {};
				plugin.engine.text = null;
			}

			log(sprintf('events s:%s', plugin.actual.screen), '>>');
			$.each(plugin.cache.screen.events, function(event_index, event) {
				log(sprintf('s:%s, e:%s, b:%s', plugin.actual.screen, event_index, event.binding));
				plugin.engine.events[event.binding] = event.macros;
			});
			log(sprintf('events s:%s', plugin.actual.screen), '<<');

			log(sprintf('macros s:%s', plugin.actual.screen), '>>');
			$.each(plugin.cache.screen.macros, function(macro_index, macro) {
				parse_macro(macro, macro_index);
			});
			log(sprintf('macros s:%s', plugin.actual.screen), '<<');

			log(sprintf('loading s:%s', plugin.actual.screen), '<<');
		});
	}



	var screen_render = function(force) {
		force = (typeof force === 'undefined') ? false : force;

		if (force) {
			log('rendering', '>>');

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
						'<div id="action-%s-%s" data-id="%s" class="action" style="width:%spx;height:%spx;left:%spx;top:%spx;" title="e:%s"></div>',
						plugin.actual.screen,
						button.id,
						button.id,
						button.hover_bottomright_x - button.hover_topleft_x,
						button.hover_bottomright_y - button.hover_topleft_y,
						button.hover_topleft_x,
						button.hover_topleft_y,
						button.id
					));
				}
				else {
					plugin.wrappers.display.append(sprintf(
						'<div id="action-%s-%s" data-id="%s" class="action" style="width:%spx;height:%spx;left:%spx;top:%spx;" title="e:%s"></div>',
						plugin.actual.screen,
						button.id,
						button.id,
						image.width,
						image.height,
						button.topleft_x,
						button.topleft_y,
						button.id
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
					'<div id="action-%s-%s" data-id="%s" class="action" style="width:%spx;height:%spx;left:%spx;top:%spx;" title="e:%s"></div>',
					plugin.actual.screen,
					ad.id,
					ad.id,
					image.width,
					image.height,
					ad.topleft_x,
					ad.topleft_y,
					ad.id
				));
			});

			log('rendering', '<<');
		}

		$('.action').click(function() {
			log_empty();
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
			'<div>* ivars</div>'
		));
		$.each(plugin.engine.ivars, function(ivar_index, ivar) {
			plugin.wrappers.info.append(sprintf(
				'<div>ivar %s = %s</div>',
				ivar_index,
				ivar
			));
		});

		plugin.wrappers.info.append(sprintf(
			'<div>* svars</div>'
		));
		$.each(plugin.engine.svars, function(svar_index, svar) {
			plugin.wrappers.info.append(sprintf(
				'<div>svar %s = "%s"</div>',
				svar_index,
				svar
			));
		});

		plugin.wrappers.info.append(sprintf(
			'<div>* screen</div>'
		));
		plugin.wrappers.info.append(sprintf(
			'<div>screen = %s</div>',
			plugin.engine.screen ? plugin.engine.screen.id : 'null'
		));

		plugin.wrappers.info.append(sprintf(
			'<div>* text</div>'
		));
		plugin.wrappers.info.append(sprintf(
			'<div>text = %s</div>',
			plugin.engine.text ? plugin.engine.text.content : 'null'
		));

		plugin.wrappers.info.append(sprintf(
			'<div>* events</div>'
		));
		$.each(plugin.engine.events, function(event_index, event) {
			plugin.wrappers.info.append(sprintf(
				'<div>event %s = %s</div>',
				event_index,
				event
			));
			plugin.wrappers.info.append(sprintf(
				'<div class="info-event-%s"></div>',
				event_index
			));
			$(sprintf('.info-event-%s', event_index)).JSONView(
				JSON.stringify(event),
				{ 'collapsed': true }
			);
		});
	}



	// ******************************************* logging *******************************************
	var log_empty = function() {
		plugin.wrappers.log.empty();
	}



	var log = function(string, mark) {
		var mark = typeof mark !== 'undefined' ? mark : '*';

		$.klan.log(sprintf('[%s] %s %s', plugin.meta.name, mark, string));

		if (plugin.wrappers.log) {
			plugin.wrappers.log.append(sprintf('<div>%s %s</div>', mark, string));
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
		var log_base = sprintf('s:%s, m:%s, t:%s', plugin.actual.screen, macro_index, macro.type);

		if (macro.type == 'button') {
			log(sprintf('%s&nbsp; &nbsp;id = %s', log_base, macro.params.id));
			if (macro.params.id < 32768) {
				plugin.engine.buttons[macro.params.id] = macro.params;
			}
		}

		else if (macro.type == 'event') {
			log(sprintf('%s&nbsp; &nbsp;id = %s', log_base, macro.params.id));
			run_event(macro.params.id);
		}

		else if (macro.type == 'gotopage') {
			if (macro.params.id < 32768) {
				log(sprintf('%s&nbsp; &nbsp;id = %s', log_base, macro.params.id));
				plugin.actual.screen = macro.params.id;
			}
			else {
				log(sprintf('%s&nbsp; &nbsp;id = %s (%s=>%s)', log_base, macro.params.id, 65536 - macro.params.id, plugin.engine.ivars[65536 - macro.params.id]));
				plugin.actual.screen = plugin.engine.ivars[65536 - macro.params.id];
			}
			screen_load();
		}

		else if (macro.type == 'if') {
			var value_1 = null;
			var value_2 = null;
			var condition = null;
			var condition_log = sprintf("%s?", macro.params.branches.branch_if.condition);

			if (macro.params.branches.branch_if.value_1 < 32768) {
				// TODO ???
			}
			else {
				value_1 = plugin.engine.ivars[65536 - macro.params.branches.branch_if.value_1]
			}

			value_2 = macro.params.branches.branch_if.value_2;

			if (macro.params.branches.branch_if.condition == 1) {
				condition = (value_1 == value_2);
				condition_log = '==';
			}
			else if (macro.params.branches.branch_if.condition == 3) {
// 				condition = (value_1 == value_2);
// 				condition_log = '';
			}

			log(sprintf('%s&nbsp; &nbsp;%s(%s) %s %s(%s)', log_base, macro.params.branches.branch_if.value_1, value_1, condition_log, macro.params.branches.branch_if.value_2, value_2));
			log(sprintf('macros m:%s', macro_index), '>>');
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
			log(sprintf('macros m:%s', macro_index), '<<');
		}

		else if (macro.type == 'ivar/mov') {
			log(sprintf('%s&nbsp; &nbsp;%s = %s', log_base, macro.params.variable, macro.params.value));
			plugin.engine.ivars[macro.params.variable] = macro.params.value;
		}

		else if (macro.type == 'keybutt') {
			log(sprintf('%s&nbsp; &nbsp;TODO', log_base));
			// TODO
		}

		else if (macro.type == 'reklama') {
			log(sprintf('%s&nbsp; &nbsp;id = %s', log_base, macro.params.id));
			plugin.engine.ads[macro.params.id] = macro.params;
		}

		else if (macro.type == 'screen') {
			log(sprintf('%s&nbsp; &nbsp;%s', log_base, macro.params.id));
			plugin.engine.screen = macro.params;
		}

		else if (macro.type == 'separator') {
			// PASS
		}

		else if (macro.type == 'svar') {
			log(sprintf('%s&nbsp; &nbsp;%s = "%s"', log_base, macro.params.variable, macro.params.value));
			plugin.engine.svars[macro.params.variable] = macro.params.value;
		}

		else if (macro.type == 'text') {
			log(sprintf('%s&nbsp; &nbsp;content = "%s"', log_base, macro.params.content));
			plugin.engine.text = macro.params;
		}

		else if (macro.type == 'woknoshit') {
			log(sprintf('%s&nbsp; &nbsp;TODO', log_base));
			screen_render(true);
		}

		else {
			log(sprintf('%s&nbsp; &nbsp;UNKNOWN MACRO', log_base));
		}

		info_render();
	}



	var run_event = function(event_id) {
		log(sprintf('event e:%s', event_id), '>>');

		if (event_id) {
			log(sprintf('macros e:%s', event_id), '>>');
			$.each(plugin.engine.events[event_id], function(event_macro_index, event_macro) {
				parse_macro(event_macro, event_macro_index);
			});
			log(sprintf('macros e:%s', event_id), '<<');
		}
		else {
			alert('Exit to DOS :-)');
		}

		log(sprintf('event e:%s', event_id), '<<');
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
