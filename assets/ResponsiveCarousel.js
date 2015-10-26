/*
	TITLE: ResponsiveCarousel

	DESCRIPTION: A carousel widget that responds to mobile, tablet, and desaktop media queries

	VERSION: 0.2.6

	USAGE: var myCarousel = new ResponsiveCarousel('Element', 'Options')
		@param {jQuery Object}
		@param {Object}

	AUTHOR: CN

	DEPENDENCIES:
		- jquery 2.1x+
		- greensock
		- Class.js

*/

var ResponsiveCarousel = Class.extend({
	init: function($el, objOptions) {

		// defaults
		this.$window = $(window);
		this.$htmlBody = $('html, body');
		this.$el = $el;
		this.options = $.extend({
			initialIndex: 0,
			numVisibleItemsMobile: 1,
			numItemsToAnimateMobile: 1,
			numVisibleItemsTablet: 1,
			numItemsToAnimateTablet: 1,
			numVisibleItemsDesktop: 1,
			numItemsToAnimateDesktop: 1,
			enableSwipe: true,
			loopEndToEnd: false,
			selectorNavPrev: '.nav-prev',
			selectorNavNext: '.nav-next',
			selectorInnerTrack: '.inner-track',
			selectorPanels: 'article',
			classActiveItem: 'active',
			classNavDisabled: 'disabled',
			autoRotate: false,
			autoRotateInterval: 8000,
			maxAutoRotations: 5,
			animDuration: 0.6,
			animEasing: 'Power4.easeInOut',
			selectorFocusEls: 'a, button, input, select, textarea',
			customEventName: 'CNJS:ResponsiveCarousel'
		}, objOptions || {});

		// element references
		this.$navPrev = this.$el.find(this.options.selectorNavPrev);
		this.$navNext = this.$el.find(this.options.selectorNavNext);
		this.$innerTrack = this.$el.find(this.options.selectorInnerTrack);
		this.$panels = this.$innerTrack.children(this.options.selectorPanels);

		// setup & properties
		this._length = this.$panels.length;
		if (this.options.initialIndex >= this._length) {this.options.initialIndex = 0;}
		this.currentIndex = this.options.initialIndex;
		this.lastIndex = null;
		this.itemWidth = null;
		this.scrollAmt = null;
		this.trackWidth = null;
		this.numVisibleItems = null;
		this.numItemsToAnimate = null;
		this.isAnimating = false;

		this.initDOM();

		this.setOptions();

		this.setDOM();

		this.bindEvents();

		$.event.trigger(this.options.customEventName + ':isInitialized', [this.$el]);

	},


/**
*	Private Methods
**/

	initDOM: function() {

		this.$el.attr({'role':'tablist', 'aria-live':'polite'});
		this.$navPrev.attr({'role':'button', 'tabindex':'0'});
		this.$navNext.attr({'role':'button', 'tabindex':'0'});
		this.$panels.attr({'role':'tabpanel', 'tabindex':'-1', 'aria-hidden':'true'});

		// auto-rotate items
		if (this.options.autoRotate) {
			this.rotationInterval = this.options.autoRotateInterval;
			this.autoRotationCounter = this._length * this.options.maxAutoRotations;
			this.setAutoRotation = setInterval(function() {
				this.autoRotation();
			}.bind(this), this.rotationInterval);
		}

	},

	setOptions: function() {
		// console.log(Config.currentBreakpoint);

		switch(Config.currentBreakpoint) {
			case 'mobile':
				this.numVisibleItems = this.options.numVisibleItemsMobile;
				this.numItemsToAnimate = this.options.numItemsToAnimateMobile;
				break;
			case 'tablet':
				this.numVisibleItems = this.options.numVisibleItemsTablet;
				this.numItemsToAnimate = this.options.numItemsToAnimateTablet;
				break;
			case 'desktop':
				this.numVisibleItems = this.options.numVisibleItemsDesktop;
				this.numItemsToAnimate = this.options.numItemsToAnimateDesktop;
				break;
			default:
				console.error('ERROR: Invalid Breakpoint');
		}

		this.lastIndex = this._length - this.numVisibleItems;
		if (this.currentIndex > this.lastIndex) {this.currentIndex = this.lastIndex;}
		this.itemWidth = 100 / this._length;
		this.scrollAmt = (100 / this.numVisibleItems) * -1;
		this.trackWidth = (1 / this.numVisibleItems) * (this._length * 100);

	},

	setDOM: function() {
		var itemWidth = this.itemWidth + '%';
		var trackWidth = this.trackWidth + '%';
		var leftPos = (this.scrollAmt * this.currentIndex) + '%';

		// disable nav links if not enough visible items
		this.updateNav();
		if (this._length <= this.numVisibleItems) {
			this.$navPrev.addClass(this.options.classNavDisabled).attr({'tabindex':'-1'});
			this.$navNext.addClass(this.options.classNavDisabled).attr({'tabindex':'-1'});
		}

		// adjust initial position
		this.$panels.css({width: itemWidth});
		TweenMax.set(this.$innerTrack, {
			width: trackWidth,
			left: leftPos
		}); 

		this.deactivateItems();
		this.activateItems();

	},

	bindEvents: function() {
		var self = this;

		this.$window.on('breakpointChange', function(event, params) {
			self.__onBreakpointChange(event, params);
		}.bind(this));

		this.$navPrev.on('click', function(event) {
			event.preventDefault();
			if (!this.$navPrev.hasClass(this.options.classNavDisabled) && !this.isAnimating) {
				this.__clickNavPrev(event);
			}
		}.bind(this));

		this.$navNext.on('click', function(event) {
			event.preventDefault();
			if (!this.$navNext.hasClass(this.options.classNavDisabled) && !this.isAnimating) {
				this.__clickNavNext(event);
			}
		}.bind(this));

		if (this.options.enableSwipe) {
			this.$el.swipe({
				fingers: 'all',
				excludedElements: '.noSwipe',
				threshold: 50,
				triggerOnTouchEnd: false, // triggers on threshold
				swipeLeft: function(event) {
					if (!self.$navNext.hasClass(self.options.classNavDisabled) && !self.isAnimating) {
						self.__clickNavNext(event);
					}
				},
				swipeRight: function(event) {
					if (!self.$navPrev.hasClass(self.options.classNavDisabled) && !self.isAnimating) {
						self.__clickNavPrev(event);
					}
				},
				allowPageScroll: 'vertical'
			});
		}

	},

	unbindEvents: function() {
		this.$window.off('breakpointChange', function(){});
		this.$navPrev.off('click', function(){});
		this.$navNext.off('click', function(){});
		if (this.options.enableSwipe) {
			this.$el.swipe('destroy');
		}
	},

	autoRotation: function() {

		if (this.currentIndex === this.lastIndex) {
			this.currentIndex = 0;
		} else {
			this.currentIndex += this.numItemsToAnimate;
			if (this.currentIndex > this.lastIndex) {this.currentIndex = this.lastIndex;}
		}

		this.updateCarousel();
		this.autoRotationCounter--;

		if (this.autoRotationCounter === 0) {
			clearInterval(this.setAutoRotation);
			this.options.autoRotate = false;
		}

	},


/**
*	Event Handlers
**/

	__onBreakpointChange: function(event, params) {
		// console.log(params);
		this.setOptions();
		this.setDOM();
	},

	__clickNavPrev: function(event) {

		if (this.options.autoRotate) {
			clearInterval(this.setAutoRotation);
			this.options.autoRotate = false;
		}

		if (this.options.loopEndToEnd && this.currentIndex === 0) {
			this.currentIndex = this.lastIndex;
		} else {
			this.currentIndex -= this.numItemsToAnimate;
			if (this.currentIndex < 0) {this.currentIndex = 0;}
		}

		this.updateCarousel(event);

	},

	__clickNavNext: function(event) {

		if (this.options.autoRotate) {
			clearInterval(this.setAutoRotation);
			this.options.autoRotate = false;
		}

		if (this.options.loopEndToEnd && this.currentIndex === this.lastIndex) {
			this.currentIndex = 0;
		} else {
			this.currentIndex += this.numItemsToAnimate;
			if (this.currentIndex > this.lastIndex) {this.currentIndex = this.lastIndex;}
		}

		this.updateCarousel(event);

	},


/**
*	Public Methods
**/

	updateCarousel: function(event) {
		var self = this;
		var leftPos = (this.scrollAmt * this.currentIndex) + '%';
		var $activePanel = this.$panels.eq(this.currentIndex);

		this.isAnimating = true;

		this.deactivateItems();

		this.updateNav();

		TweenMax.to(this.$innerTrack, this.options.animDuration, {
			left: leftPos,
			ease: this.options.animEasing,
			onComplete: function() {
				self.isAnimating = false;
				self.activateItems();
				if (!!event) {
					self.focusOnPanel($activePanel);
				}
			}
		});

		$.event.trigger(this.options.customEventName + ':carouselUpdated', [this.currentIndex]);

	},

	updateNav: function() {

		this.$navPrev.removeClass(this.options.classNavDisabled).attr({'tabindex':'0'});
		this.$navNext.removeClass(this.options.classNavDisabled).attr({'tabindex':'0'});

		if (!this.options.loopEndToEnd) {
			if (this.currentIndex <= 0) {
				this.$navPrev.addClass(this.options.classNavDisabled).attr({'tabindex':'-1'});
			}
			if (this.currentIndex >= this.lastIndex) {
				this.$navNext.addClass(this.options.classNavDisabled).attr({'tabindex':'-1'});
			}
		}

	},

	deactivateItems: function() {
		this.$panels.removeClass(this.options.classActiveItem).attr({'tabindex':'-1', 'aria-hidden':'true'});
		this.$panels.find(this.options.selectorFocusEls).attr({'tabindex':'-1'});
	},

	activateItems: function() {
		var self = this;
		var first = this.currentIndex;
		var last = this.currentIndex + this.numVisibleItems;
		var $activeItems = this.$panels.slice(first, last);
		var delay = 100;

		$activeItems.each(function(index) {
			var $item = $(this);
			$item.delay(delay*index).queue(function() {
				$item.find(self.options.selectorFocusEls).attr({'tabindex':'0', 'aria-hidden':'false'});
				$item.addClass(self.options.classActiveItem).attr({'tabindex':'0'}).dequeue();
			});
		});

	},

	focusOnPanel: function($panel) {
		var pnlTop = $panel.offset().top;
		var pnlHeight = $panel.outerHeight();
		var winTop = this.$window.scrollTop();
		var winHeight = this.$window.height();
		if (pnlHeight > winHeight || pnlTop < winTop) {
			this.$htmlBody.animate({scrollTop: pnlTop}, 200, function() {
				$panel.focus();
			});
		} else {
			$panel.focus();
		}
	}

});

//uncomment to use as a browserify module
//module.exports = ResponsiveCarousel;
