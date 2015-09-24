/*
	TITLE: ResponsiveCarousel

	DESCRIPTION: A carousel widget that responds to mobile, tablet, and desaktop media queries

	VERSION: 0.2.0

	USAGE: var myCarousel = new ResponsiveCarousel('Element', 'Options')
		@param {jQuery Object}
		@param {Object}

	AUTHOR: CN

	DEPENDENCIES:
		- jQuery 2.1x+
		- greensock
		- Class.js

*/

var ResponsiveCarousel = Class.extend({
	init: function($el, objOptions) {

		// defaults
		this.$window = $(window);
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
			selectorNavPrev: '.nav-prev',
			selectorNavNext: '.nav-next',
			selectorInnerTrack: '.inner-track',
			selectorItems: 'article',
			classActiveItem: 'active',
			classNavDisabled: 'disabled',
			autoRotate: false,
			autoRotateInterval: 8000,
			maxAutoRotations: 5,
			animDuration: 0.6,
			animEasing: 'Power4.easeInOut',
			selectorFocusEls: 'a, button, input, select, textarea',
			customEventPrfx: 'CNJS:ResponsiveCarousel'
		}, objOptions || {});

		// element references
		this.$navPrev = this.$el.find(this.options.selectorNavPrev);
		this.$navNext = this.$el.find(this.options.selectorNavNext);
		this.$innerTrack = this.$el.find(this.options.selectorInnerTrack);
		this.$items = this.$innerTrack.children(this.options.selectorItems);

		// setup & properties
		this.isAnimating = false;
		this.lenItems = this.$items.length;
		if (this.options.initialIndex >= this.lenItems) {this.options.initialIndex = 0;}
		this.currentIndex = this.options.initialIndex;
		this.lastIndex = null;
		this.itemWidth = null;
		this.scrollAmt = null;
		this.trackWidth = null;

		this.setOptions();

		this.setDOM();

		this.bindEvents();

		$.event.trigger(this.options.customEventPrfx + ':isInitialized', [this.$el]);

		// auto-rotate items
		if (this.options.autoRotate) {
			this.rotationInterval = this.options.autoRotateInterval;
			this.autoRotationCounter = this.lenItems * this.options.maxAutoRotations;
			this.setAutoRotation = setInterval(function() {
				this.autoRotation();
			}.bind(this), this.rotationInterval);
		}

	},


/**
*	Private Methods
**/

	setOptions: function() {

		console.log(Config.currentBreakpoint);

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

		this.lastIndex = this.lenItems - this.numVisibleItems;
		this.itemWidth = 100 / this.lenItems;
		this.scrollAmt = (100 / this.numVisibleItems) * -1;
		this.trackWidth = (1 / this.numVisibleItems) * (this.lenItems * 100);

	},

	setDOM: function() {
		var $currentItem = $(this.$items[this.currentIndex]);
		var itemWidth = this.itemWidth + '%';
		var trackWidth = this.trackWidth + '%';
		var leftPos = (this.scrollAmt * this.currentIndex) + '%';

		// disable nav links if not enough visible items
		this.updateNav();
		if (this.lenItems <= this.numVisibleItems) {
			this.$navPrev.addClass(this.options.classNavDisabled).attr({tabindex: '-1'});
			this.$navNext.addClass(this.options.classNavDisabled).attr({tabindex: '-1'});
		}

		// adjust initial position
		this.$items.css({width: itemWidth});
		TweenMax.set(this.$innerTrack, {
			width: trackWidth,
			left: leftPos
		}); 

		this.deactivateItems();
		this.activateItem($currentItem);

	},

	bindEvents: function() {
		var self = this;

		this.$window.on('BreakpointChange', function(event, params) {
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
		this.$window.off('BreakpointChange', function(){});
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
		console.log('__onBreakpointChange');
		// console.log(params);
		this.setOptions();
		this.setDOM();
	},

	__clickNavPrev: function(event) {

		if (this.options.autoRotate) {
			clearInterval(this.setAutoRotation);
			this.options.autoRotate = false;
		}

		this.currentIndex -= this.numItemsToAnimate;
		if (this.currentIndex < 0) {this.currentIndex = 0;}

		this.updateCarousel();

	},

	__clickNavNext: function(event) {

		if (this.options.autoRotate) {
			clearInterval(this.setAutoRotation);
			this.options.autoRotate = false;
		}

		this.currentIndex += this.numItemsToAnimate;
		if (this.currentIndex > this.lastIndex) {this.currentIndex = this.lastIndex;}

		this.updateCarousel();

	},


/**
*	Public Methods
**/

	updateCarousel: function() {
		var self = this;
		var leftPos = (this.scrollAmt * this.currentIndex) + '%';
		var $currentItem = $(this.$items[this.currentIndex]);

		this.isAnimating = true;

		this.deactivateItems();

		this.updateNav();

		TweenMax.to(this.$innerTrack, this.options.animDuration, {
			left: leftPos,
			ease: self.options.animEasing,
			onComplete: function() {
				self.isAnimating = false;
				self.activateItem($currentItem);
			}
		});

		$.event.trigger(this.options.customEventPrfx + ':carouselUpdated', [this.currentIndex]);

	},

	updateNav: function() {

		this.$navPrev.removeClass(this.options.classNavDisabled).attr({tabindex: '0'});
		this.$navNext.removeClass(this.options.classNavDisabled).attr({tabindex: '0'});

		if (this.currentIndex <= 0) {
			this.$navPrev.addClass(this.options.classNavDisabled).attr({tabindex: '-1'});
		}

		if (this.currentIndex >= this.lastIndex) {
			this.$navNext.addClass(this.options.classNavDisabled).attr({tabindex: '-1'});
		}

	},

	deactivateItems: function() {
		this.$items.removeClass(this.options.classActiveItem).attr({tabindex: '-1'});
		this.$items.find(this.options.selectorFocusEls).attr({tabindex: '-1'});
	},

	activateItem: function($elem) {
		$elem.addClass(this.options.classActiveItem).attr({tabindex: '0'});
		$elem.find(this.options.selectorFocusEls).attr({tabindex: '0'});
	}

});

//uncomment to use as a browserify module
//module.exports = ResponsiveCarousel;
