(function ($) {

$.klan = $.klan || {};
$.klan.api = $.klan.api || {};
$.klan.api.root = 'https://data.klan2016.cz/v1/';
$.klan.api.cache = {};



$.klan.api.url = function(key) {
	return $.klan.api.root + key + '.json';
}



$.klan.api.cache_set = function(key, value, cache_html5) {
	var cache_html5 = typeof cache_html5 !== 'undefined' ? cache_html5 : false;
	$.klan.api.cache[key] = value;
	if (cache_html5 && $.klan.api.html5_storage) {
		var item = {
			created: moment().toISOString(),
			value: value
		}
		localStorage.setItem(key, JSON.stringify(item));
	}
}



$.klan.api.cache_get = function(key, cache_html5, cache_html5_timeout) {
	var cache_html5 = typeof cache_html5 !== 'undefined' ? cache_html5 : false;
	var cache_html5_timeout = typeof cache_html5_timeout !== 'undefined' ? cache_html5_timeout : 600;
	if (!$.klan.api.cache[key] && cache_html5 && $.klan.api.html5_storage) {
		if (localStorage.getItem(key)) {
			var item = JSON.parse(localStorage.getItem(key));
			var item_age = moment.duration(moment() - moment(item.created)).asSeconds();
			if (item_age > cache_html5_timeout) {
				localStorage.removeItem(key);
			}
			else {
				$.klan.api.cache[key] = item.value;
			}
		}
	}
	return $.klan.api.cache[key];
}



$.klan.api.remote = function(paths, callback) {
	var deferreds = [];

	if (!(paths instanceof Array)) {
		paths = [ paths ];
	}

	$.each(paths, function(index, path) {
		deferreds.push(
			$.ajax({
				url: $.klan.api.url(path),
				dataType: 'jsonp'
			})
		);
	});

	$.when.all(deferreds).then(function(responses_raw) {
		var responses = [];

		if (deferreds.length == 1) {
			responses = responses_raw[0];
		}
		else {
			$.each(responses_raw, function(index, response_raw) {
				responses.push(response_raw[0]);
			});
		}

		callback(responses);
	});
}



$.klan.api.common = function(url, callback) {
	$.when(
		$.ajax({
			url: url,
			dataType: 'jsonp'
		}),
		$.Deferred(function(deferred) {
			$(deferred.resolve);
		})
	).done(function(response) {
		var response = response[0];

		callback(response);
	});
}



$.klan.api.browser_supports_html5_storage = function() {
	try {
		return 'localStorage' in window && window['localStorage'] !== null;
	} catch (e) {
		return false;
	}
}
$.klan.api.html5_storage = $.klan.api.browser_supports_html5_storage();

})(jQuery);
