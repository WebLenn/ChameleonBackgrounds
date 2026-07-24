/**
 *    _____ _                          _
 *   / ____| |                        | |
 *  | |    | |__   __ _ _ __ ___   ___| | ___  ___  _ __
 *  | |    | '_ \ / _` | '_ ` _ \ / _ \ |/ _ \/ _ \| '_ \
 *  | |____| | | | (_| | | | | | |  __/ |  __/ (_) | | | |
 *   \_____|_| |_|\__,_|_| |_| |_|\___|_|\___|\___|_| |_|_
 *  |  _ \           | |                                 | |
 *  | |_) | __ _  ___| | ____ _ _ __ ___  _   _ _ __   __| |___
 *  |  _ < / _` |/ __| |/ / _` | '__/ _ \| | | | '_ \ / _` / __|
 *  | |_) | (_| | (__|   < (_| | | | (_) | |_| | | | | (_| \__ \
 *  |____/ \__,_|\___|_|\_\__, |_|  \___/ \__,_|_| |_|\__,_|___/
 *                         __/ |
 *                        |___/
 *
 *  ChameleonBackgrounds v2.0.0 — UMD Bundle
 *  A zero-dependency JavaScript library to dynamically load background
 *  images with elegant fade-in transitions and slideshow support.
 *
 *  @author Lennart van Ballegoij (https://weblenn.com/)
 *  @license MIT
 *  @see https://github.com/WebLenn/ChameleonBackgrounds
 */
(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    // AMD
    define([], factory);
  } else if (typeof module === 'object' && module.exports) {
    // CommonJS
    module.exports = factory();
  } else {
    // Browser global
    root.ChameleonBackgrounds = factory();
  }
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  /**
   * @typedef {Object} ChameleonOptions
   * @property {string|HTMLElement}       element             - CSS selector or DOM element to attach to.
   * @property {'single'|'slider'}       type                - Background mode.
   * @property {string|string[]}         src                 - Image URL(s). String for 'single', array for 'slider'.
   * @property {string}                  overlayColor        - Overlay color (hex, rgb, rgba, hsl).
   * @property {string}                  [overlayImage]      - Optional overlay pattern image URL.
   * @property {number}                  [minOverlay=0]      - Minimum overlay opacity after fade (0–1).
   * @property {number}                  [transitionDuration=2000] - Fade duration in milliseconds.
   * @property {number}                  [sliderDuration=8000]     - Time each slide is shown in milliseconds.
   * @property {boolean}                 [sliderLoop=false]        - Whether the slider restarts after the last slide.
   */

  const DEFAULTS = Object.freeze({
    element: 'body',
    type: 'single',
    src: '',
    overlayColor: '#0f1e25',
    overlayImage: null,
    minOverlay: 0,
    transitionDuration: 2000,
    sliderDuration: 8000,
    sliderLoop: false,
  });

  const ALIASES = Object.freeze({
    transition_duration: 'transitionDuration',
    slider_duration: 'sliderDuration',
    slider_loop: 'sliderLoop',
    min_overlay: 'minOverlay',
    overlay_color: 'overlayColor',
    overlay_image: 'overlayImage',
  });

  /**
   * Convert legacy snake_case option keys to camelCase.
   */
  function normalizeOptions(opts) {
    const result = {};
    for (const key of Object.keys(opts)) {
      const alias = ALIASES[key];
      result[alias !== undefined ? alias : key] = opts[key];
    }
    return result;
  }

  /**
   * Resolve a CSS selector string or HTMLElement to an HTMLElement.
   */
  function resolveElement(el) {
    if (el instanceof HTMLElement) return el;
    if (typeof el === 'string') {
      if (el === 'body') return document.body;
      var found = document.querySelector(el);
      if (!found) throw new Error('[ChameleonBackgrounds] Element not found: ' + el);
      return found;
    }
    throw new TypeError('[ChameleonBackgrounds] Invalid element: ' + el);
  }

  /**
   * Generate a short unique ID for scoping styles.
   */
  function generateUID() {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID().slice(0, 8);
    }
    return Array.from({ length: 8 }, function () {
      return 'abcdefghijklmnopqrstuvwxyz0123456789'.charAt(Math.floor(Math.random() * 36));
    }).join('');
  }

  // -------------------------------------------------------------------------
  //  Constructor
  // -------------------------------------------------------------------------

  function ChameleonBackgrounds(options) {
    if (!(this instanceof ChameleonBackgrounds)) {
      return new ChameleonBackgrounds(options);
    }

    var normalized = normalizeOptions(options || {});
    this._options = {};
    for (var k in DEFAULTS) {
      if (DEFAULTS.hasOwnProperty(k)) {
        this._options[k] = normalized[k] !== undefined ? normalized[k] : DEFAULTS[k];
      }
    }

    this._uid = generateUID();
    this._element = resolveElement(this._options.element);
    this._originalHTML = this._element.innerHTML;
    this._styleElement = null;
    this._sliderIntervalId = null;
    this._destroyed = false;

    this._init();
  }

  // -------------------------------------------------------------------------
  //  Public API
  // -------------------------------------------------------------------------

  /**
   * Clean up all injected DOM, styles, and intervals.
   * Restores the target element to its original state.
   */
  ChameleonBackgrounds.prototype.destroy = function () {
    if (this._destroyed) return;
    this._destroyed = true;

    if (this._sliderIntervalId !== null) {
      clearInterval(this._sliderIntervalId);
      this._sliderIntervalId = null;
    }

    if (this._styleElement && this._styleElement.parentNode) {
      this._styleElement.parentNode.removeChild(this._styleElement);
      this._styleElement = null;
    }

    this._element.innerHTML = this._originalHTML;
    this._element.style.backgroundImage = '';
  };

  /**
   * Readonly copy of the resolved options.
   */
  ChameleonBackgrounds.prototype.getOptions = function () {
    var copy = {};
    for (var k in this._options) {
      if (this._options.hasOwnProperty(k)) {
        copy[k] = this._options[k];
      }
    }
    return copy;
  };

  // -------------------------------------------------------------------------
  //  Initialization (private by convention)
  // -------------------------------------------------------------------------

  ChameleonBackgrounds.prototype._init = function () {
    this._injectStyles();
    this._buildDOM();

    var self = this;

    if (this._element === document.body || this._element.matches('body')) {
      // Use a microtask so the DOM changes settle first
      Promise.resolve().then(function () { self._retrieveBackground(); });
    } else {
      if (document.readyState === 'complete') {
        this._retrieveBackground();
      } else {
        window.addEventListener('load', function onLoad() {
          window.removeEventListener('load', onLoad);
          self._retrieveBackground();
        });
      }
    }
  };

  ChameleonBackgrounds.prototype._injectStyles = function () {
    var uid = this._uid;
    var selector = this._options.element === 'body' || this._element.matches('body')
      ? 'body'
      : this._options.element;
    var duration = this._options.transitionDuration / 1000;
    var position = this._element.matches('body') ? 'fixed' : 'absolute';
    var overlayBg = this._options.overlayImage
      ? 'url(' + this._options.overlayImage + ')'
      : 'none';

    var selectorStr = typeof selector === 'string' ? selector : '.cbg-host-' + uid;

    var css =
      selectorStr + ' { position: relative; } ' +
      '#cbg-inner-' + uid + ' { z-index: 2; position: relative; } ' +
      '.cbg-loader-' + uid + ' { ' +
      'height: 100%; width: 100%; ' +
      'position: ' + position + '; ' +
      'background-image: ' + overlayBg + '; ' +
      'background-color: ' + this._options.overlayColor + '; ' +
      'opacity: 1; z-index: 1; ' +
      'transition: opacity ' + duration + 's ease; ' +
      'top: 0; left: 0; ' +
      '}';

    var style = document.createElement('style');
    style.setAttribute('data-chameleon-uid', uid);
    style.textContent = css;
    document.head.appendChild(style);
    this._styleElement = style;
  };

  ChameleonBackgrounds.prototype._buildDOM = function () {
    var uid = this._uid;
    var content = this._element.innerHTML;

    var wrapper = document.createElement('div');
    wrapper.id = 'cbg-inner-' + uid;
    wrapper.innerHTML = content;

    var loader = document.createElement('div');
    loader.className = 'cbg-loader-' + uid;

    this._element.innerHTML = '';
    this._element.appendChild(wrapper);
    this._element.appendChild(loader);
  };

  // -------------------------------------------------------------------------
  //  Background Loading
  // -------------------------------------------------------------------------

  ChameleonBackgrounds.prototype._retrieveBackground = function () {
    if (this._destroyed) return;

    if (this._options.type === 'single') {
      var src = typeof this._options.src === 'string'
        ? this._options.src
        : this._options.src[0];
      this._loadBackground(src);
    } else if (this._options.type === 'slider') {
      this._startSlider();
    }
  };

  ChameleonBackgrounds.prototype._loadBackground = function (src, callback) {
    if (this._destroyed) { if (callback) callback(); return; }

    var self = this;
    var img = new Image();

    img.onload = function () {
      if (self._destroyed) { if (callback) callback(); return; }

      self._element.style.backgroundImage = 'url(' + src + ')';
      self._element.style.backgroundSize = 'cover';

      var loader = self._element.querySelector('.cbg-loader-' + self._uid);
      if (loader) {
        loader.style.opacity = String(self._options.minOverlay);
      }

      if (callback) callback();
    };

    img.onerror = function () {
      console.warn('[ChameleonBackgrounds] Failed to load image: ' + src);
      if (callback) callback();
    };

    img.src = src;
  };

  ChameleonBackgrounds.prototype.reloadBackground = function (src, callback) {
    if (this._destroyed) { if (callback) callback(); return; }

    var loader = this._element.querySelector('.cbg-loader-' + this._uid);
    if (loader) {
      loader.style.opacity = '1';
    }

    var self = this;
    setTimeout(function () {
      if (self._destroyed) { if (callback) callback(); return; }
      self._loadBackground(src, callback);
    }, this._options.transitionDuration);
  };

  // -------------------------------------------------------------------------
  //  Slider
  // -------------------------------------------------------------------------

  ChameleonBackgrounds.prototype._startSlider = function () {
    if (this._destroyed) return;

    var sources = this._options.src;
    if (!Array.isArray(sources) || sources.length === 0) {
      console.warn('[ChameleonBackgrounds] Slider mode requires an array of image URLs in `src`.');
      return;
    }

    var self = this;
    var index = 0;

    this._loadBackground(sources[index], function () {
      if (self._destroyed) return;

      index = 1;
      if (sources.length === 1) return;

      var interval = self._options.sliderDuration + self._options.transitionDuration * 2;

      self._sliderIntervalId = setInterval(function () {
        if (self._destroyed) {
          clearInterval(self._sliderIntervalId);
          return;
        }

        self.reloadBackground(sources[index]);
        index++;

        if (index >= sources.length) {
          if (self._options.sliderLoop) {
            index = 0;
          } else {
            clearInterval(self._sliderIntervalId);
            self._sliderIntervalId = null;
          }
        }
      }, interval);
    });
  };

  return ChameleonBackgrounds;
}));
