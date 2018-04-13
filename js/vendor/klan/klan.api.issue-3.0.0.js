(function ($) {

$.klan = $.klan || {};
$.klan.api = $.klan.api || {};
$.klan.api.issue = $.klan.api.issue || {};



$.klan.api.issue.screens = function(issue, reload) {
	var issue = typeof issue !== 'undefined' ? issue : false;
	var reload = typeof reload !== 'undefined' ? reload : false;
	var key = sprintf('%s/screens',
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



$.klan.api.issue.images = function(issue, reload) {
	var issue = typeof issue !== 'undefined' ? issue : false;
	var reload = typeof reload !== 'undefined' ? reload : false;
	var key = sprintf('%s/images',
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



$.klan.api.issue.texts = function(issue, reload) {
	var issue = typeof issue !== 'undefined' ? issue : false;
	var reload = typeof reload !== 'undefined' ? reload : false;
	var key = sprintf('%s/texts',
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
