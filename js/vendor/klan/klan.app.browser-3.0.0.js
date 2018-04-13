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

				screen_load(function() {
					screen_render(true);
				});

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
				'<div class="wrapper-screen cro-clearfix"></div>' +
			'</div>',
			plugin.actual.issue
		));

		plugin.wrappers.screen = $('.wrapper-screen', $element);

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

		output = sprintf(
			'<div class="screen"></div>'
		);

		plugin.wrappers.screen.html(output);

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



	var screen_load = function(callback) {
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

			$.each(plugin.cache.screen.macros, function(macro_index, macro) {
				if (macro.type == 'ivar/mov') {
					plugin.engine.ivars[macro.params.variable] = macro.params.value;
				}

				if (macro.type == 'screen') {
					plugin.engine.screen = macro.params;
				}

				if (macro.type == 'button') {
					plugin.engine.buttons[macro.params.id] = macro.params;
				}

				if (macro.type == 'keybutt') {
				}

				if (macro.type == 'text') {
					plugin.engine.text = macro.params;
				}

				if (macro.type == 'woknoshit') {
				}

				if (macro.type == 'reklama') {
					plugin.engine.ads[macro.params.id] = macro.params;
				}

				if (macro.type == 'event') {
				}

				if (macro.type == 'separator') {
				}
			});

			log('screen_load: loaded');
			flag('screen', 'loaded');

			if (typeof callback === 'undefined') {
				log('screen_load: no callback');
			}
			else {
				log(sprintf('screen_load: callback (%s)', callback.toString()));
				callback();
			}

			log('screen_load: unlocking, end');
			unlock('screen_load');
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

			if (plugin.engine.screen) {
				$('.screen', plugin.wrappers.screen).css('background-image', sprintf(
					'url(https://api.klan2016.cz/%s/images/0/%04d.png',
					plugin.actual.issue,
					plugin.engine.screen.id
				));
			}

			if (plugin.engine.text) {
				$('.screen', plugin.wrappers.screen).append(sprintf(
					'<div id="component-%s-text" class="component text" style="width:%spx;height:%spx;margin-left:%spx;margin-top:%spx;"><img src="https://api.klan2016.cz/%s/texts/0/%03d/0.png" /></div>',
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

				$('.screen', plugin.wrappers.screen).append(sprintf(
					'<div id="component-%s-%s" class="component button" style="width:%spx;height:%spx;margin-left:%spx;margin-top:%spx;background-image:url(https://api.klan2016.cz/%s/images/0/%04d.png);"></div>',
					plugin.actual.screen,
					button.id,
					image.width,
					image.height,
					button.topleft_x,
					button.topleft_y,
					plugin.actual.issue,
					button.image
				));
			});

			$.each(plugin.engine.ads, function(ad_index, ad) {
				var image = plugin.cache.images[ad.image];

				$('.screen', plugin.wrappers.screen).append(sprintf(
					'<div id="component-%s-%s" class="component ad" style="width:%spx;height:%spx;margin-left:%spx;margin-top:%spx;background-image:url(https://api.klan2016.cz/%s/images/0/%04d.png);"></div>',
					plugin.actual.screen,
					ad.id,
					image.width,
					image.height,
					ad.topleft_x,
					ad.topleft_y,
					plugin.actual.issue,
					ad.image
				));
			});
		}

// 			if (screen.type == '0000000e') {
// 				var components = '';
// 				var actions = '';
// 
// 				$.each(screen.components, function(index_component, item_component) {
// 					if (item_component.type == 'button') {
// 						var image = plugin.cache.images[item_component.image_id]; // TODO
// 
// 						components += sprintf(
// 							'<div id="component-%s-%s" class="component button" style="width:%spx;height:%spx;margin-top:%spx;margin-left:%spx;background-image:url(https://data.klan2016.cz/v1/%s/images/%05d.png);"></div>',
// 							screen.id,
// 							item_component.id,
// 							item_component.geometry.width,
// 							item_component.geometry.height,
// 							item_component.geometry.y,
// 							item_component.geometry.x,
// 							plugin.actual.issue,
// 							image.id
// 						);
// 
// 						if (item_component.actions && item_component.actions.length) {
// 							var action_screen = plugin.actual.screen;
// 							var action_text = undefined;
// 							var action_type = '';
// 							var action_params = [];
// 
// 							$.each(item_component.actions, function(index_action_item, item_action_item) {
// 								if (item_action_item.type == '1') {
// 									action_type += ' action-todo';
// 								}
// 								if (item_action_item.type == 'screen') {
// 									action_screen = item_action_item.screen_id;
// 									if (action_screen == 65535 && plugin.actual.params.back_screen) {
// 										action_screen = plugin.actual.params.back_screen;
// 									}
// 								}
// 								if (item_action_item.type == 'main') {
// 									action_text = item_action_item.text_id;
// 								}
// 								if (item_action_item.type == 'exit') {
// 									action_type += ' action-exit';
// 								}
// 								if (
// 									item_action_item.type == 'text' ||
// 									item_action_item.type == 'gallery' ||
// 									item_action_item.type == 'info' ||
// 									item_action_item.type == 'demo'
// 								) {
// 									action_params.push(sprintf(
// 										'%s:%s',
// 										item_action_item.type,
// 										item_action_item.text_id
// 									));
// 								}
// 								if (
// 									item_action_item.type == 'videos_offset' ||
// 									item_action_item.type == 'videos_count' ||
// 									item_action_item.type == 'videos_images_offset' ||
// 									item_action_item.type == 'images_offset' ||
// 									item_action_item.type == 'images_count' ||
// 									item_action_item.type == 'sounds_offset' ||
// 									item_action_item.type == 'sounds_count'
// 								) {
// 									action_params.push(sprintf(
// 										'%s:%s',
// 										item_action_item.type,
// 										item_action_item.value
// 									));
// 								}
// 							});
// 
// 							if (action_screen == 14) {
// 								action_params.push(sprintf(
// 									'%s:%s',
// 									'back_screen',
// 									screen.id
// 								));
// 							}
// 
// 							actions += sprintf(
// 								'<div id="action-%s-%s" class="action%s" style="width:%spx;height:%spx;margin-top:%spx;margin-left:%spx;"><a href="#/%s/%s%s%s"></a></div>',
// 								screen.id,
// 								item_component.id,
// 								action_type,
// 								item_component.hover.width,
// 								item_component.hover.height,
// 								item_component.hover.y,
// 								item_component.hover.x,
// 								plugin.actual.issue,
// 								action_screen,
// 								(action_text !== undefined) ? sprintf('/%s', action_text) : (action_params.length ? '/-' : ''),
// 								action_params.length ? sprintf('/%s', action_params.join('|')) : ''
// 							);
// 						}
// 					}
// 
// 					if (item_component.type == 'slider') {
// 						var image = plugin.cache.images[item_component.image_id]; // TODO
// 
// 						components += sprintf(
// 							'<div id="component-%s-%s" class="component slider" style="width:%spx;height:%spx;margin-top:%spx;margin-left:%spx;background-image:url(https://data.klan2016.cz/v1/%s/images/%05d.png);"></div>',
// 							screen.id,
// 							item_component.id,
// 							item_component.geometry.width,
// 							item_component.geometry.height,
// 							item_component.geometry.y,
// 							item_component.geometry.x,
// 							plugin.actual.issue,
// 							image.id
// 						);
// 					}
// 
// 					if (item_component.type == 'main') {
// 						plugin.actual.text = (plugin.actual.text !== undefined) ? plugin.actual.text : item_component.text_id
// 
// 						components += sprintf(
// 							'<div id="component-%s-main" class="component main" style="width:%spx;height:%spx;margin-top:%spx;margin-left:%spx;"></div>',
// 							screen.id,
// 							item_component.geometry.width + 30,
// 							item_component.geometry.height,
// 							item_component.geometry.y,
// 							item_component.geometry.x
// 						);
// 						components += sprintf(
// 							'<div id="component-%s-main-slider" class="component main-slider" style="height:%spx;margin-top:%spx;margin-left:%spx;"></div>',
// 							screen.id,
// 							item_component.slider.height,
// 							item_component.slider.y,
// 							item_component.slider.x
// 						);
// 					}
// 
// 					if (item_component.type == 'ad') {
// 						var image = plugin.cache.images[item_component.image_id]; // TODO
// 
// 						components += sprintf(
// 							'<div id="component-%s-%s" class="component ad" style="width:%spx;height:%spx;margin-top:%spx;margin-left:%spx;background-image:url(https://data.klan2016.cz/v1/%s/images/%05d.png);"></div>',
// 							screen.id,
// 							item_component.id,
// 							item_component.geometry.width,
// 							item_component.geometry.height,
// 							item_component.geometry.y,
// 							item_component.geometry.x,
// 							plugin.actual.issue,
// 							image.id
// 						);
// 
// 						if (item_component.actions.length) {
// 							$.each(item_component.actions, function(index_action_item, item_action_item) {
// 								var action_screen = plugin.actual.screen;
// 								var action_text = undefined;
// 
// 								if (item_action_item.type == 'screen') {
// 									action_screen = item_action_item.screen_id;
// 								}
// 								if (item_action_item.type == 'main') {
// 									action_text = item_action_item.text_id;
// 								}
// 
// 								actions += sprintf(
// 									'<div id="action-%s-%s" class="action" style="width:%spx;height:%spx;margin-top:%spx;margin-left:%spx;"><a href="#/%s/%s%s"></a></div>',
// 									screen.id,
// 									item_component.id,
// 									item_component.geometry.width,
// 									item_component.geometry.height,
// 									item_component.geometry.y,
// 									item_component.geometry.x,
// 									plugin.actual.issue,
// 									action_screen,
// 									(action_text !== undefined) ? sprintf('/%s', action_text) : ''
// 								);
// 							});
// 						}
// 					}
// 				});
// 
// 				output = sprintf(
// 					'<div id="screen-%s" class="screen" style="background-image:url(https://data.klan2016.cz/v1/%s/images/%05d.png);">%s%s</div>',
// 					screen.id,
// 					plugin.actual.issue,
// 					screen.canvas.image_id,
// 					components,
// 					actions
// 				);
// 			}

// 			plugin.wrappers.screen.html(output);

// 			$('.action-todo').click(function() {
// 				alert('TODO...');
// 				return false;
// 			});
// 
// 			$('.action-exit').click(function() {
// 				alert('EXIT back to DOS :-)');
// 				return false;
// 			});
// 
// 			$.getJSON(sprintf('https://data.klan2016.cz/v1/%s/texts/%s.json', plugin.actual.issue, plugin.actual.text), function(data_text) {
// 				var content_display = '';
// 
// 				$.each(data_text.rows, function(index_row, item_row) {
// 					var row = '';
// 					var bold_state = false;
// 					var italic_state = false;
// 					var link_state = false;
// 					var font_id = 0;
// 					var action_params = [];
// 
// 					$.each(item_row.tokens, function(index_token, item_token) {
// 						if (item_token.type == 'font') {
// 							font_id = item_token.value - 1;
// 						}
// 						if (item_token.type == 'mode') {
// 							if (item_token.value == 'bold') {
// 								bold_state = item_token.state;
// 							}
// 							if (item_token.value == 'italic') {
// 								italic_state = item_token.state;
// 							}
// 						}
// 						if (item_token.type == 'link') {
// 							link_state = item_token.state;
// 							if (link_state) {
// 								if (item_token.link_type == 14) {
// 									$.each(item_token.actions, function(index_action_item, item_action_item) {
// 										if (
// 											item_action_item.type == 'text' ||
// 											item_action_item.type == 'gallery' ||
// 											item_action_item.type == 'info' ||
// 											item_action_item.type == 'demo'
// 										) {
// 											action_params.push(sprintf(
// 												'%s:%s',
// 												item_action_item.type,
// 												item_action_item.text_id
// 											));
// 										}
// 										if (
// 											item_action_item.type == 'videos_offset' ||
// 											item_action_item.type == 'videos_count' ||
// 											item_action_item.type == 'videos_images_offset' ||
// 											item_action_item.type == 'images_offset' ||
// 											item_action_item.type == 'images_count' ||
// 											item_action_item.type == 'sounds_offset' ||
// 											item_action_item.type == 'sounds_count'
// 										) {
// 											action_params.push(sprintf(
// 												'%s:%s',
// 												item_action_item.type,
// 												item_action_item.value
// 											));
// 										}
// 									});
// 
// 									action_params.push(sprintf(
// 										'%s:%s',
// 										'back_screen',
// 										screen.id == 14 ? plugin.actual.params.back_screen : screen.id
// 									));
// 
// 									row += sprintf(
// 										'<a href="#/%s/%s%s%s">',
// 										plugin.actual.issue,
// 										'14',
// 										'/-',
// 										action_params.length ? sprintf('/%s', action_params.join('|')) : ''
// 									);
// 								}
// 								else if (item_token.link_type == 65518) {
// 									row += sprintf(
// 										'<a href="#/%s/%s/%s">',
// 										plugin.actual.issue,
// 										plugin.actual.screen,
// 										item_token.actions[0].text_id
// 									);
// 								}
// 								else {
// 									row += sprintf(
// 										'<a href="#">'
// 									);
// 								}
// 							}
// 							else {
// 								row += '</a>';
// 								action_params = [];
// 							}
// 						}
// 						if (item_token.type == 'space') {
// 							row += sprintf(
// 								'<span class="space" style="width:%spx;"></span>',
// 								item_token.width
// 							);
// 						}
// 						if (item_token.type == 'text') {
// 							var text = '';
// 							$.each(item_token.characters, function(index_char, item_char) {
// 								text += sprintf(
// 									'<span class="char-%s"></span>',
// 									item_char
// 								);
// 							});
// 							row += sprintf(
// 								'<span class="text font-%s%s%s" title="%s">%s</span>',
// 								font_id,
// 								bold_state ? '-bold' : (italic_state ? '-italic' : ''),
// 								link_state ? '-link' : '',
// // 								link ? data_text.links[link_id].type : '',
// 								'',
// 								text
// 							);
// 						}
// 						if (item_token.type == 'picture') {
// 							row += sprintf(
// 								'<span class="picture" style="width:%spx;height:%spx;background-image:url(%s)"></span>',
// 								item_token.width,
// 								item_token.height,
// 								item_token.value
// 							);
// 						}
// 					});
// 
// 					content_display += sprintf(
// 						'<div id="row-%s" class="row" style="height:%spx;">%s</div>',
// 						index_row,
// 						item_row.height,
// 						row
// 					);
// 				});
// 
// 				$(sprintf(
// 					'#component-%s-main',
// 					plugin.actual.screen
// 				))
// 				.html(sprintf(
// 					'<div id="content-display" class="content">%s</div>',
// 					content_display
// 				));
// 
// 				$(sprintf(
// 					'#component-%s-main',
// 					plugin.actual.screen
// 				))
// 				.mCustomScrollbar({
// 					scrollInertia: 0,
// 					snapAmount: 12,
// 					mouseWheel: {
// 						enable: true,
// 						scrollAmount: 24
// 					},
// 					scrollButtons: {
// 						enable: false,
// 						scrollAmount: 24
// 					},
// 					keyboard: {
// 						enable: true,
// 						scrollAmount: 24
// 					}
// 				});
// 			});
// 		}

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
