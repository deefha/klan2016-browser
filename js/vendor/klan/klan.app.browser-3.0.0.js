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
		'events': {},
		'ivars': {},
		'svars': {},
		'screen': null,
		'buttons': {},
		'ads': {},
		'text': null
	}

	plugin.init = function() {
		log('init: begin');

		plugin.settings = $.extend({}, defaults, options);

		if ($.query.get('debug')) {
			$('body').addClass('debug');
		}

		log('init: issue/images, issue/screens, issue/texts async call');
		$.when.all([
			$.klan.api.issue.images(plugin.settings.issue),
			$.klan.api.issue.screens(plugin.settings.issue),
			$.klan.api.issue.texts(plugin.settings.issue)
		]).done(function(responses) {
			log('init: issue/images, issue/screens, issue/texts async response');

			plugin.cache.images = responses[0].images;
			plugin.cache.screens = responses[1].screens;
			plugin.cache.texts = responses[2].texts;

			plugin.cache.texts_indexed = {}
			$.each(plugin.cache.texts, function(text_index, text) {
				plugin.cache.texts_indexed[text.name.replace('/', '\\')] = text_index;
			});

			plugin.actual.issue = plugin.settings.issue;
			plugin.actual.screen = plugin.settings.screen;
			plugin.actual.text = plugin.settings.text;
			plugin.actual.params = plugin.settings.params;

			crossroads.addRoute('/{issue}/{screen}/:text:/:params_raw:', function(issue, screen, text, params_raw) {
				log(sprintf('crossroads: parse (issue="%s", screen="%s", text="%s", params_raw="%s")', issue, screen, text, params_raw));

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
				log(sprintf('crossroads: parse (issue="%s")', issue));

				plugin.actual.issue = issue;
				plugin.actual.screen = 1;

				hasher.replaceHash(sprintf('%s/%s', plugin.actual.issue, plugin.actual.screen));
			});

			function hasher_init(hash_current) {
				log(sprintf('hasher: init (hash="%s")', hash_current));

				if (hash_current == '') {
					hasher.replaceHash(plugin.actual.issue);
				}
				else {
					crossroads.parse(hash_current);
				}
			}

			function hasher_parse(hash_new, hash_old) {
				log(sprintf('hasher: change ("%s"=>"%s")', hash_old, hash_new));

				crossroads.parse(hash_new);
			}

			wrappers_prepare();
			screen_prepare();

			hasher.initialized.add(hasher_init);
			hasher.changed.add(hasher_parse);
			hasher.init();
		});

		log('init: end');
	}



// ******************************************* wrappers *******************************************
	var wrappers_prepare = function(callback) {
		log('wrappers_prepare: begin');

		if (locked('wrappers_prepare')) {
			log('wrappers_prepare: locked, end');
			return false;
		}

		log('wrappers_prepare: locking');
		lock('wrappers_prepare');

		$element.html(sprintf(
			'<div class="klan-app-browser klan-issue-%s klan-clearfix">' +
				'<div class="wrapper-display cro-clearfix"></div>' +
			'</div>',
			plugin.actual.issue
		));

		plugin.wrappers.display = $('.wrapper-display', $element);

		log('wrappers_prepare: prepared');
		flag('wrappers', 'prepared');

		if (typeof callback === 'undefined') {
			log('wrappers_prepare: no callback');
		}
		else {
			log(sprintf('wrappers_prepare: callback (%s)', callback.toString()));
			callback();
		}

		log('wrappers_prepare: unlocking, end');
		unlock('wrappers_prepare');
	}



	// ******************************************* screen *******************************************
	var screen_prepare = function(callback) {
		log('screen_prepare: begin');

		if (locked('screen_prepare')) {
			log('screen_prepare: locked, end');
			return false;
		}

		if (!flagged('wrappers', 'prepared')) {
			log('screen_prepare: wrappers not prepared, end');
			return false;
		}

		log('screen_prepare: locking');
		lock('screen_prepare');

		log('screen_prepare: prepared');
		flag('screen', 'prepared');

		if (typeof callback === 'undefined') {
			log('screen_prepare: no callback');
		}
		else {
			log(sprintf('screen_prepare: callback (%s)', callback.toString()));
			callback();
		}

		log('screen_prepare: unlocking, end');
		unlock('screen_prepare');
	}



	var screen_load = function() {
		log('screen_load: begin');

		if (locked('screen_load')) {
			log('screen_load: locked, end');
			return false;
		}

		if (!flagged('screen', 'prepared')) {
			log('screen_load: screen not prepared, end');
			return false;
		}

		log('screen_load: locking');
		lock('screen_load');

		unflag('screen', 'loaded');

		log('screen_load: issue/screens/id async call');
		$.when.all([
			$.klan.api.issue.screens(plugin.actual.issue, plugin.actual.screen)
		]).done(function(responses) {
			log('screen_load: issue/screens/id async response');
			plugin.cache.screen = responses[0];

			log('screen_load: loaded');
			flag('screen', 'loaded');

			log('screen_load: unlocking, end');
			unlock('screen_load');

			if (plugin.cache.screen.type_1 == 0) {
				plugin.engine = {
					'events': {},
					'ivars': {},
					'svars': {},
					'screen': null,
					'buttons': {},
					'ads': {},
					'text': null
				}
			}

			$.each(plugin.cache.screen.events, function(event_index, event) {
				log(sprintf('event set: %s', event.binding));
				plugin.engine.events[event.binding] = event.macros;
			});

			$.each(plugin.cache.screen.macros, function(macro_index, macro) {
				parse_macro(macro);
			});

// 			if (typeof callback === 'undefined') {
// 				log('screen_load: no callback');
// 			}
// 			else {
// 				log(sprintf('screen_load: callback (%s)', callback.toString()));
// 				callback();
// 			}
		});

		log('screen_load: async end');
	}



	var screen_render = function(force) {
		log('screen_render: begin');

		if (locked('screen_render')) {
			log('screen_render: locked, end');
			return false;
		}

		if (!flagged('screen', 'loaded')) {
			log('screen_render: screen not loaded, end');
			return false;
		}

		log('screen_render: locking');
		lock('screen_render');

		force = (typeof force === 'undefined') ? false : force;

		if (force) {
			log(sprintf('screen_render: rendering%s', force ? ' (forced)' : ''));

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
			$.each(plugin.engine.events[$(this).data('id')], function(event_macro_index, event_macro) {
				parse_macro(event_macro);
			});

			screen_render(true);

			return false;
		});

		log('screen_render: unlocking, end');
		unlock('screen_render');
	}



	// ******************************************* logging *******************************************
	var log = function(string) {
		$.klan.log(sprintf('[%s] %s', plugin.meta.name, string));
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
	var parse_macro = function(macro) {
		log(sprintf('parse_macro: %s', macro.type));
		if (macro.type == 'button') {
			if (macro.params.id < 32768) {
				plugin.engine.buttons[macro.params.id] = macro.params;
			}
		}

		if (macro.type == 'event') {
			$.each(plugin.engine.events[macro.params.id], function(event_macro_index, event_macro) {
				parse_macro(event_macro);
			});
		}

		if (macro.type == 'gotopage') {
			plugin.actual.screen = macro.params.id;
			screen_load();
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

		if (macro.type == 'text') {
			plugin.engine.text = macro.params;
		}

		if (macro.type == 'woknoshit') {
			screen_render(true);
		}
	}



	log(sprintf('version: %s', plugin.meta.version));
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
