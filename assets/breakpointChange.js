/**
 *  breakpointChange
 *  @author Chris Nelson
 *	Create pseudo 'breakpointChange' event
 */

var breakpointChange = function() {
	var self = this;
	var $elIndicator = $('<div></div>',{
		'id': 'breakpoint-indicator'
	}).appendTo($('body'));
	var zIndex = $elIndicator.css('z-index');

	Config.currentBreakpoint = Config.breakpoints[zIndex];

	$(window).on('resize', function(event) {
		var newZI = $elIndicator.css('z-index');
		if (newZI !== zIndex) {
			zIndex = newZI;
			Config.currentBreakpoint = Config.breakpoints[zIndex];
			$.event.trigger('breakpointChange', {breakpoint: Config.currentBreakpoint} );
		}
	});

};
