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
 *  @module ChameleonBackgrounds
 *  @version 2.0.0
 *  @author Lennart van Ballegoij (https://weblenn.com/)
 *  @license MIT
 *  @see https://github.com/WebLenn/ChameleonBackgrounds
 *
 *  A zero-dependency JavaScript library to dynamically load background
 *  images with elegant fade-in transitions and slideshow support.
 */

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

class ChameleonBackgrounds {
  /** @type {ChameleonOptions} */
  static #DEFAULTS = Object.freeze({
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

  // Legacy snake_case → camelCase alias map
  static #ALIASES = Object.freeze({
    transition_duration: 'transitionDuration',
    slider_duration: 'sliderDuration',
    slider_loop: 'sliderLoop',
    min_overlay: 'minOverlay',
    overlay_color: 'overlayColor',
    overlay_image: 'overlayImage',
  });

  /** @type {ChameleonOptions} */
  #options;

  /** @type {HTMLElement} */
  #element;

  /** @type {string} */
  #uid;

  /** @type {string} */
  #originalHTML;

  /** @type {HTMLStyleElement|null} */
  #styleElement = null;

  /** @type {number|null} */
  #sliderIntervalId = null;

  /** @type {boolean} */
  #destroyed = false;

  /**
   * Create a new ChameleonBackgrounds instance.
   * @param {Partial<ChameleonOptions>} [options]
   */
  constructor(options = {}) {
    const normalized = ChameleonBackgrounds.#normalizeOptions(options);
    this.#options = { ...ChameleonBackgrounds.#DEFAULTS, ...normalized };
    this.#uid = ChameleonBackgrounds.#generateUID();
    this.#element = ChameleonBackgrounds.#resolveElement(this.#options.element);
    this.#originalHTML = this.#element.innerHTML;

    this.#init();
  }

  // ---------------------------------------------------------------------------
  //  Public API
  // ---------------------------------------------------------------------------

  /**
   * Clean up all injected DOM, styles, and intervals.
   * Restores the target element to its original state.
   */
  destroy() {
    if (this.#destroyed) return;
    this.#destroyed = true;

    // Stop any running slider
    if (this.#sliderIntervalId !== null) {
      clearInterval(this.#sliderIntervalId);
      this.#sliderIntervalId = null;
    }

    // Remove injected style element
    if (this.#styleElement?.parentNode) {
      this.#styleElement.parentNode.removeChild(this.#styleElement);
      this.#styleElement = null;
    }

    // Unwrap the original content instead of resetting innerHTML
    const wrapper = this.#element.querySelector(`#cbg-inner-${this.#uid}`);
    if (wrapper && wrapper.parentNode === this.#element) {
      while (wrapper.firstChild) {
        this.#element.insertBefore(wrapper.firstChild, wrapper);
      }
      this.#element.removeChild(wrapper);
    }

    // Remove loader
    const loader = this.#element.querySelector(`.cbg-loader-${this.#uid}`);
    if (loader) {
      loader.remove();
    }

    // Remove inline background-image
    this.#element.style.backgroundImage = '';
  }

  /**
   * The resolved options (read-only copy).
   * @returns {ChameleonOptions}
   */
  get options() {
    return { ...this.#options };
  }

  // ---------------------------------------------------------------------------
  //  Initialization
  // ---------------------------------------------------------------------------

  #init() {
    this.#injectStyles();
    this.#buildDOM();

    // If the element is NOT <body>, wait for window load to start loading images.
    // For <body>, the loader is already visible, so we start immediately to avoid
    // the re-execution issue the legacy lib had with body scripts.
    if (this.#element.matches('body')) {
      // Use a microtask so the DOM changes above settle first.
      queueMicrotask(() => this.#retrieveBackground());
    } else {
      if (document.readyState === 'complete') {
        this.#retrieveBackground();
      } else {
        window.addEventListener('load', () => this.#retrieveBackground(), { once: true });
      }
    }
  }

  // ---------------------------------------------------------------------------
  //  DOM Construction
  // ---------------------------------------------------------------------------

  /**
   * Inject a scoped <style> element into the <head>.
   */
  #injectStyles() {
    const uid = this.#uid;
    const selector = this.#options.element === 'body' || this.#element.matches('body')
      ? 'body'
      : this.#options.element;
    const duration = this.#options.transitionDuration / 1000; // ms → s
    const position = this.#element.matches('body') ? 'fixed' : 'absolute';
    const overlayBg = this.#options.overlayImage
      ? `url(${this.#options.overlayImage})`
      : 'none';

    const css = `
      ${typeof selector === 'string' ? selector : `.cbg-host-${uid}`} {
        position: relative;
      }

      #cbg-inner-${uid} {
        z-index: 2;
        position: relative;
      }

      .cbg-loader-${uid} {
        height: 100%;
        width: 100%;
        position: ${position};
        background-image: ${overlayBg};
        background-color: ${this.#options.overlayColor};
        opacity: 1;
        z-index: 1;
        transition: opacity ${duration}s ease;
        top: 0;
        left: 0;
      }
    `;

    const style = document.createElement('style');
    style.dataset.chameleonUid = uid;
    style.textContent = css;
    document.head.appendChild(style);
    this.#styleElement = style;
  }

  /**
   * Wrap existing content and insert the overlay loader.
   */
  #buildDOM() {
    const uid = this.#uid;

    const wrapper = document.createElement('div');
    wrapper.id = `cbg-inner-${uid}`;

    // Move all child nodes from the element into the wrapper
    while (this.#element.firstChild) {
      wrapper.appendChild(this.#element.firstChild);
    }

    const loader = document.createElement('div');
    loader.classList.add(`cbg-loader-${uid}`);

    // Append wrapper and loader
    this.#element.appendChild(wrapper);
    this.#element.appendChild(loader);
  }

  // ---------------------------------------------------------------------------
  //  Background Loading
  // ---------------------------------------------------------------------------

  /**
   * Route to the correct loader based on type.
   */
  #retrieveBackground() {
    if (this.#destroyed) return;

    if (this.#options.type === 'single') {
      this.#loadBackground(typeof this.#options.src === 'string' ? this.#options.src : this.#options.src[0]);
    } else if (this.#options.type === 'slider') {
      this.#startSlider();
    }
  }

  /**
   * Preload an image and apply it as the element's background.
   * @param {string}   src      - Image URL to load.
   * @param {boolean}  [isFirst=true] - Whether this is the first image (skips overlay reset).
   * @returns {Promise<void>}
   */
  #loadBackground(src, isFirst = true) {
    if (this.#destroyed) return Promise.resolve();

    return new Promise((resolve) => {
      const img = new Image();

      img.onload = () => {
        if (this.#destroyed) return resolve();

        this.#element.style.backgroundImage = `url(${src})`;
        this.#element.style.backgroundSize = 'cover';

        const loader = this.#element.querySelector(`.cbg-loader-${this.#uid}`);
        if (loader) {
          loader.style.opacity = String(this.#options.minOverlay);
        }

        resolve();
      };

      img.onerror = () => {
        console.warn(`[ChameleonBackgrounds] Failed to load image: ${src}`);
        resolve();
      };

      img.src = src;
    });
  }

  /**
  /**
   * Reload background with a fade-out → swap → fade-in cycle.
   * @param {string} [src] - Optional new image URL. If omitted, reloads using current options.
   * @returns {Promise<void>}
   */
  reloadBackground(src) {
    if (this.#destroyed) return Promise.resolve();

    if (src !== undefined) {
      if (this.#options.type === 'slider' && typeof src === 'string') {
        // If the user passes a comma-separated string, split it. Otherwise wrap it.
        this.#options.src = src.includes(',') ? src.split(',').map(s => s.trim()) : [src];
      } else {
        this.#options.src = src;
      }
    }

    // Stop any running slider
    if (this.#sliderIntervalId !== null) {
      clearInterval(this.#sliderIntervalId);
      this.#sliderIntervalId = null;
    }

    const loader = this.#element.querySelector(`.cbg-loader-${this.#uid}`);
    if (loader) {
      loader.style.opacity = '1';
    }

    return new Promise((resolve) => {
      setTimeout(() => {
        if (this.#destroyed) return resolve();
        
        if (this.#options.type === 'single') {
          const singleSrc = typeof this.#options.src === 'string' ? this.#options.src : this.#options.src[0];
          this.#loadBackground(singleSrc, false).then(resolve);
        } else if (this.#options.type === 'slider') {
          this.#startSlider();
          resolve();
        }
      }, this.#options.transitionDuration);
    });
  }

  /**
   * Update options on the fly without destroying the instance.
   * @param {Object} newOptions - The new options to merge.
   */
  reloadOptions(newOptions) {
    if (this.#destroyed) return;

    const normalized = ChameleonBackgrounds.#normalizeOptions(newOptions);
    this.#options = { ...this.#options, ...normalized };

    // Remove old styles
    if (this.#styleElement?.parentNode) {
      this.#styleElement.parentNode.removeChild(this.#styleElement);
      this.#styleElement = null;
    }

    // Inject updated styles
    this.#injectStyles();
  }

  // ---------------------------------------------------------------------------
  //  Slider
  // ---------------------------------------------------------------------------

  /**
   * Start the background slideshow.
   */
  #startSlider() {
    if (this.#destroyed) return;

    const sources = this.#options.src;
    if (!Array.isArray(sources) || sources.length === 0) {
      console.warn('[ChameleonBackgrounds] Slider mode requires an array of image URLs in `src`.');
      return;
    }

    // Load the first slide immediately
    let index = 0;
    this.#loadBackground(sources[index]).then(() => {
      if (this.#destroyed) return;

      index = 1;
      if (sources.length === 1) return; // only one slide, nothing to rotate

      const interval = this.#options.sliderDuration + this.#options.transitionDuration * 2;

      this.#sliderIntervalId = setInterval(() => {
        if (this.#destroyed) {
          clearInterval(this.#sliderIntervalId);
          return;
        }

        this.reloadBackground(sources[index]);
        index++;

        if (index >= sources.length) {
          if (this.#options.sliderLoop) {
            index = 0;
          } else {
            clearInterval(this.#sliderIntervalId);
            this.#sliderIntervalId = null;
          }
        }
      }, interval);
    });
  }

  // ---------------------------------------------------------------------------
  //  Static Helpers
  // ---------------------------------------------------------------------------

  /**
   * Convert legacy snake_case option keys to camelCase.
   * @param {Object} opts
   * @returns {Object}
   */
  static #normalizeOptions(opts) {
    const result = {};
    for (const [key, value] of Object.entries(opts)) {
      const alias = ChameleonBackgrounds.#ALIASES[key];
      result[alias ?? key] = value;
    }
    return result;
  }

  /**
   * Resolve a CSS selector string or HTMLElement to an HTMLElement.
   * @param {string|HTMLElement} el
   * @returns {HTMLElement}
   */
  static #resolveElement(el) {
    if (el instanceof HTMLElement) return el;
    if (typeof el === 'string') {
      if (el === 'body') return document.body;
      const found = document.querySelector(el);
      if (!found) throw new Error(`[ChameleonBackgrounds] Element not found: ${el}`);
      return /** @type {HTMLElement} */ (found);
    }
    throw new TypeError(`[ChameleonBackgrounds] Invalid element: ${el}`);
  }

  /**
   * Generate a short unique ID for scoping styles.
   * @returns {string}
   */
  static #generateUID() {
    // Prefer crypto.randomUUID where available, otherwise fall back
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID().slice(0, 8);
    }
    // Fallback: random alphanumeric string
    return Array.from({ length: 8 }, () =>
      'abcdefghijklmnopqrstuvwxyz0123456789'.charAt(Math.floor(Math.random() * 36))
    ).join('');
  }
}

export default ChameleonBackgrounds;
export { ChameleonBackgrounds };
