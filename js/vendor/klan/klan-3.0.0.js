(function ($) {

$.klan = $.klan || {};



if ($.query.get('debug') && typeof console !== 'undefined') {
	$.klan.log = function(string) {
		console.log(sprintf('%s %s', moment().format('HH:mm:ss.SSS'), string));
	}
}
else {
	$.klan.log = function(string) {
		return false;
	}
}



if (jQuery.when.all === undefined) {
	jQuery.when.all = function(deferreds) {
		var deferred = new jQuery.Deferred();

		$.when.apply(jQuery, deferreds).then(
			function() {
				deferred.resolve(Array.prototype.slice.call(arguments));
			},
			function() {
				deferred.fail(Array.prototype.slice.call(arguments));
			});

		return deferred;
	}
}



})(jQuery);
