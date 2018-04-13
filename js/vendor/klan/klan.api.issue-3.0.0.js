(function ($) {

$.klan = $.klan || {};
$.klan.api = $.klan.api || {};
$.klan.api.issue = $.klan.api.issue || {};



$.klan.api.issue.screens = function(issue, id, reload) {
	var issue = typeof issue !== 'undefined' ? issue : false;
	var id = typeof id !== 'undefined' ? id : false;
	var reload = typeof reload !== 'undefined' ? reload : false;
	var key = sprintf('%s/screens/0%s',
		issue,
		id ? sprintf('/%03d', id) : ''
	);

	if (reload || !$.klan.api.cache_get(key)) {
		return $.ajax({
			url: $.klan.api.url(key),
			dataType: 'jsonp',
			success: function(response) {
			}
		})
		.then(function(response) {
			$.klan.api.cache_set(key, response);
			return $.klan.api.cache_get(key);
		});
	}
	else {
		return $.klan.api.cache_get(key);
	}
}



$.klan.api.issue.images = function(issue, reload) {
	var issue = typeof issue !== 'undefined' ? issue : false;
	var reload = typeof reload !== 'undefined' ? reload : false;
	var key = sprintf('%s/images/0',
		issue
	);

	if (reload || !$.klan.api.cache_get(key)) {
		return $.ajax({
			url: $.klan.api.url(key),
			dataType: 'jsonp',
			success: function(response) {
			}
		})
		.then(function(response) {
			$.klan.api.cache_set(key, response);
			return $.klan.api.cache_get(key);
		});
	}
	else {
		return $.klan.api.cache_get(key);
	}
}



$.klan.api.issue.texts = function(issue, id, variant, reload) {
	var issue = typeof issue !== 'undefined' ? issue : false;
	var id = typeof id !== 'undefined' ? id : false;
	var variant = typeof variant !== 'undefined' ? variant : false;
	var reload = typeof reload !== 'undefined' ? reload : false;
	var key = sprintf('%s/texts/0%s',
		issue,
		id && variant ? sprintf('/%03d/%s', id, variant) : ''
	);

	if (reload || !$.klan.api.cache_get(key)) {
		return $.ajax({
			url: $.klan.api.url(key),
			dataType: 'jsonp',
			success: function(response) {
			}
		})
		.then(function(response) {
			$.klan.api.cache_set(key, response);
			return $.klan.api.cache_get(key);
		});
	}
	else {
		return $.klan.api.cache_get(key);
	}
}



$.klan.api.issue.fonts = function(issue, reload) {
	var issue = typeof issue !== 'undefined' ? issue : false;
	var reload = typeof reload !== 'undefined' ? reload : false;
	var key = sprintf('%s/fonts',
		issue
	);

	if (reload || !$.klan.api.cache_get(key)) {
		return $.ajax({
			url: $.klan.api.url(key),
			dataType: 'jsonp',
			success: function(response) {
			}
		})
		.then(function(response) {
			$.klan.api.cache_set(key, response);
			return $.klan.api.cache_get(key);
		});
	}
	else {
		return $.klan.api.cache_get(key);
	}
}



$.klan.api.issue.sounds = function(issue, reload) {
	var issue = typeof issue !== 'undefined' ? issue : false;
	var reload = typeof reload !== 'undefined' ? reload : false;
	var key = sprintf('%s/sounds',
		issue
	);

	if (reload || !$.klan.api.cache_get(key)) {
		return $.ajax({
			url: $.klan.api.url(key),
			dataType: 'jsonp',
			success: function(response) {
			}
		})
		.then(function(response) {
			$.klan.api.cache_set(key, response);
			return $.klan.api.cache_get(key);
		});
	}
	else {
		return $.klan.api.cache_get(key);
	}
}



})(jQuery);
