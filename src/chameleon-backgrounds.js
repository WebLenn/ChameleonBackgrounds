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
 *  @version 3.1.3
 *  @author Lennart van Ballegoij (https://weblenn.com/)
 *  @license MIT
 *  @see https://github.com/WebLenn/ChameleonBackgrounds
 *
 *  A zero-dependency JavaScript library to dynamically load background
 *  images with elegant fade-in transitions and slideshow support.
 */

/**
 * @typedef {Object} ChameleonImageConfig
 * @property {string} url - The fallback URL.
 * @property {string} [srcset] - Optional srcset.
 * @property {string} [sizes] - Optional sizes.
 *
 * @typedef {Object} ChameleonOptions
 * @property {string|HTMLElement}       element             - CSS selector or DOM element to attach to.
 * @property {'single'|'slider'}       type                - Background mode.
 * @property {string|string[]|ChameleonImageConfig|ChameleonImageConfig[]} src - Image URL(s) or config object(s).
 * @property {string}                  overlayColor        - Overlay color (hex, rgb, rgba, hsl).
 * @property {string}                  [overlayImage]      - Optional overlay pattern image URL.
 * @property {number}                  [minOverlay=0]      - Minimum overlay opacity after fade (0–1).
 * @property {number}                  [transitionDuration=2000] - Fade duration in milliseconds.
 * @property {number}                  [sliderDuration=8000]     - Time each slide is shown in milliseconds.
 * @property {boolean}                 [sliderLoop=false]        - Whether the slider restarts after the last slide.
 * @property {'high'|'low'|'auto'}     [fetchPriority='auto']    - fetchPriority for the first loaded image (e.g., 'high' for LCP images).
 * @property {boolean}                 [lazyLoad=true]           - Whether to wait until element is in viewport using IntersectionObserver.
 * @property {'solid'|'crossfade'}     [transitionMode='solid']  - Transition mode: 'solid' (fade to color) or 'crossfade' (fade between images).
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
    fetchPriority: 'auto',
    lazyLoad: true,
    transitionMode: 'solid',
    respectReducedMotion: false,
  });

  // Legacy snake_case → camelCase alias map
  static #ALIASES = Object.freeze({
    transition_duration: 'transitionDuration',
    slider_duration: 'sliderDuration',
    slider_loop: 'sliderLoop',
    min_overlay: 'minOverlay',
    overlay_color: 'overlayColor',
    overlay_image: 'overlayImage',
    fetch_priority: 'fetchPriority',
    lazy_load: 'lazyLoad',
    transition_mode: 'transitionMode',
    respect_reduced_motion: 'respectReducedMotion',
  });

  /** @type {boolean} */
  static #globalStylesInjected = false;

  /** @type {ChameleonOptions} */
  #options;

  /** @type {HTMLElement} */
  #element;

  /** @type {string} */
  #uid;

  /** @type {string} */
  #originalHTML;

  /** @type {number|null} */
  #sliderIntervalId = null;

  /** @type {number} */
  #currentSlideIndex = 0;

  /** @type {boolean} */
  #hasLoadedFirstBackground = false;

  /** @type {boolean} */
  #isHydrated = false;

  /** @type {number} */
  #transitionId = 0;

  /** @type {boolean} */
  #isPaused = false;

  /** @type {IntersectionObserver|null} */
  #observer = null;

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
      clearTimeout(this.#sliderIntervalId);
      this.#sliderIntervalId = null;
    }

    if (this.#observer) {
      this.#observer.disconnect();
      this.#observer = null;
    }

    // Clean up dynamic classes on host
    this.#element.classList.remove(`cbg-host-${this.#uid}`, 'cbg-host');

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

    // Remove temporary crossfade elements
    const crossfadeElements = this.#element.querySelectorAll(`.cbg-crossfade-${this.#uid}`);
    crossfadeElements.forEach(el => el.remove());

    // Remove inline CSS Variables and background-image
    this.#element.style.backgroundImage = '';
    this.#element.style.removeProperty('--cbg-duration');
    this.#element.style.removeProperty('--cbg-overlay-color');
    this.#element.style.removeProperty('--cbg-overlay-image');
    this.#element.style.removeProperty('--cbg-min-overlay');
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
    this.#injectGlobalStyles();
    this.#updateCSSVariables();
    this.#buildDOM();

    // Check for prefers-reduced-motion to auto-pause slider if enabled
    if (this.#options.respectReducedMotion && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      this.#isPaused = true;
    }

    if (this.#options.lazyLoad && 'IntersectionObserver' in window) {
      this.#observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            this.#observer.disconnect();
            this.#observer = null;
            this.#retrieveBackground();
          }
        });
      });
      this.#observer.observe(this.#element);
    } else {
      if (this.#element.matches('body')) {
        queueMicrotask(() => this.#retrieveBackground());
      } else {
        if (document.readyState === 'complete') {
          this.#retrieveBackground();
        } else {
          window.addEventListener('load', () => this.#retrieveBackground(), { once: true });
        }
      }
    }
  }

  // ---------------------------------------------------------------------------
  //  Play / Pause API
  // ---------------------------------------------------------------------------

  /**
   * Pause the slideshow.
   */
  pause() {
    if (this.#destroyed || this.#options.type !== 'slider') return;
    this.#isPaused = true;
    if (this.#sliderIntervalId !== null) {
      clearTimeout(this.#sliderIntervalId);
      this.#sliderIntervalId = null;
    }
  }

  /**
   * Resume the slideshow.
   */
  play() {
    if (this.#destroyed || this.#options.type !== 'slider') return;
    this.#isPaused = false;
    // Only restart if not currently running
    if (this.#sliderIntervalId === null) {
      this.#startSliderLoop();
    }
  }

  // ---------------------------------------------------------------------------
  //  DOM Construction
  // ---------------------------------------------------------------------------

  /**
   * Inject global styles once.
   */
  #injectGlobalStyles() {
    if (ChameleonBackgrounds.#globalStylesInjected) return;
    ChameleonBackgrounds.#globalStylesInjected = true;

    const css = `
      .cbg-host {
        position: relative;
      }
      body.cbg-host {
        /* body naturally acts as relative for background sizing if not explicitly positioned differently */
      }
      .cbg-inner {
        z-index: 2;
        position: relative;
      }
      .cbg-loader {
        height: 100%;
        width: 100%;
        position: absolute;
        top: 0;
        left: 0;
        background-image: var(--cbg-overlay-image, none);
        background-color: var(--cbg-overlay-color, transparent);
        opacity: 1;
        z-index: 1;
        transition: opacity var(--cbg-duration, 2s) ease;
        pointer-events: none;
      }
      body.cbg-host > .cbg-loader {
        position: fixed;
      }
      .cbg-crossfade-el {
        position: absolute;
        top: 0;
        left: 0;
        height: 100%;
        width: 100%;
        background-size: cover;
        background-position: center;
        background-repeat: no-repeat;
        z-index: 0;
        opacity: 0;
        transition: opacity var(--cbg-duration, 2s) ease;
        pointer-events: none;
      }
      body.cbg-host > .cbg-crossfade-el {
        position: fixed;
      }
    `;

    const style = document.createElement('style');
    style.id = 'chameleon-global-styles';
    style.textContent = css;
    document.head.appendChild(style);
  }

  /**
   * Apply CSS custom properties to the host element.
   */
  #updateCSSVariables() {
    this.#element.classList.add(`cbg-host-${this.#uid}`, 'cbg-host');
    this.#element.style.setProperty('--cbg-duration', `${this.#options.transitionDuration / 1000}s`);
    this.#element.style.setProperty('--cbg-overlay-color', this.#options.overlayColor);

    if (this.#options.overlayImage) {
      this.#element.style.setProperty('--cbg-overlay-image', `url(${this.#options.overlayImage})`);
    } else {
      this.#element.style.setProperty('--cbg-overlay-image', 'none');
    }

    this.#element.style.setProperty('--cbg-min-overlay', String(this.#options.minOverlay));
  }

  /**
   * Wrap existing content and insert the overlay loader.
   */
  #buildDOM() {
    const uid = this.#uid;

    // Check for SSR Hydration
    let innerNode = null;
    let loaderNode = null;
    for (const child of this.#element.children) {
      if (child.classList.contains('cbg-inner')) innerNode = child;
      if (child.classList.contains('cbg-loader')) loaderNode = child;
    }

    if (innerNode && loaderNode) {
      // Adopt existing DOM
      innerNode.id = `cbg-inner-${uid}`;
      loaderNode.classList.add(`cbg-loader-${uid}`);
      this.#hasLoadedFirstBackground = true;
      this.#isHydrated = true;
      return;
    }

    const wrapper = document.createElement('div');
    wrapper.id = `cbg-inner-${uid}`;
    wrapper.classList.add('cbg-inner');

    // Move all child nodes from the element into the wrapper
    while (this.#element.firstChild) {
      wrapper.appendChild(this.#element.firstChild);
    }

    const loader = document.createElement('div');
    loader.classList.add('cbg-loader', `cbg-loader-${uid}`);

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
      const singleSrc = Array.isArray(this.#options.src) ? this.#options.src[0] : this.#options.src;
      this.#loadBackground(singleSrc);
    } else if (this.#options.type === 'slider') {
      this.#startSlider();
    }
  }

  /**
   * Preload an image and apply it as the element's background.
   * Handles both string URLs and responsive image objects ({ url, srcset, sizes }).
   * @param {string|ChameleonImageConfig} srcConfig - Image configuration or URL.
   * @param {boolean}  [isFirst=true] - Whether this is the first image (skips overlay reset).
   * @param {boolean}  [isCrossfade=false] - If true, handles true crossfading without solid color drop.
   * @returns {Promise<void>}
   */
  #loadBackground(srcConfig, isFirst = true, isCrossfade = false) {
    if (this.#destroyed) return Promise.resolve();

    return new Promise((resolve) => {
      const img = new Image();

      let urlStr = srcConfig;
      if (typeof srcConfig === 'object' && srcConfig.url) {
        urlStr = srcConfig.url;
        if (srcConfig.srcset) img.srcset = srcConfig.srcset;
        if (srcConfig.sizes) img.sizes = srcConfig.sizes;
      }

      if (isFirst && 'fetchPriority' in img && this.#options.fetchPriority !== 'auto') {
        img.fetchPriority = this.#options.fetchPriority;
      }

      // Append to DOM to ensure viewport-based `sizes` calculate correctly in all browsers
      img.style.position = 'absolute';
      img.style.visibility = 'hidden';
      img.style.width = '0';
      img.style.height = '0';
      this.#element.appendChild(img);

      img.onload = () => {
        img.remove();
        if (this.#destroyed) return resolve();

        // `img.currentSrc` retrieves the actual srcset chosen file, otherwise fallback to `urlStr`
        const finalUrl = img.currentSrc || urlStr;

        if (isCrossfade && !isFirst) {
          // --- Crossfade Transition Mode ---
          const crossfadeDiv = document.createElement('div');
          crossfadeDiv.classList.add('cbg-crossfade-el', `cbg-crossfade-${this.#uid}`);
          crossfadeDiv.style.backgroundImage = `url("${finalUrl}")`;

          // Insert right behind the loader (or directly at start of host)
          this.#element.insertBefore(crossfadeDiv, this.#element.firstChild);

          // Trigger layout so the transition works
          void crossfadeDiv.offsetWidth;

          crossfadeDiv.style.opacity = '1';

          setTimeout(() => {
            if (this.#destroyed) return resolve();
            this.#element.style.backgroundImage = `url("${finalUrl}")`;
            this.#element.style.backgroundSize = 'cover';
            this.#element.style.backgroundRepeat = 'no-repeat';
            crossfadeDiv.remove();
            resolve();
          }, this.#options.transitionDuration);

        } else {
          // --- Solid Transition Mode or First Load ---
          this.#element.style.backgroundImage = `url("${finalUrl}")`;
          this.#element.style.backgroundSize = 'cover';
          this.#element.style.backgroundRepeat = 'no-repeat';

          const loader = this.#element.querySelector(`.cbg-loader-${this.#uid}`);
          if (loader) {
            loader.style.opacity = String(this.#options.minOverlay);
          }
          this.#hasLoadedFirstBackground = true;
          setTimeout(() => {
            resolve();
          }, this.#options.transitionDuration);
        }
      };

      img.onerror = () => {
        img.remove();
        console.warn(`[ChameleonBackgrounds] Failed to load image:`, srcConfig);
        resolve(); // resolve anyway to keep logic flowing
      };

      img.src = urlStr;
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

    this.#transitionId++;

    if (src !== undefined) {
      if (this.#options.type === 'slider' && typeof src === 'string') {
        // If the user passes a comma-separated string, split it.
        this.#options.src = src.includes(',') ? src.split(',').map(s => s.trim()) : [src];
      } else {
        this.#options.src = src;
      }
    }

    // Stop any running slider
    if (this.#sliderIntervalId !== null) {
      clearTimeout(this.#sliderIntervalId);
      this.#sliderIntervalId = null;
    }

    if (this.#options.type === 'single') {
      const singleSrc = Array.isArray(this.#options.src) ? this.#options.src[0] : this.#options.src;
      return this.#cycleSliderSlide(singleSrc, this.#transitionId);
    } else if (this.#options.type === 'slider') {
      this.#startSlider(this.#transitionId);
      return Promise.resolve();
    }
  }

  /**
   * Update options on the fly without destroying the instance.
   * @param {Object} newOptions - The new options to merge.
   */
  reloadOptions(newOptions) {
    if (this.#destroyed) return;

    const normalized = ChameleonBackgrounds.#normalizeOptions(newOptions);
    this.#options = { ...this.#options, ...normalized };

    this.#updateCSSVariables();
    // In v1/v2, reloadOptions did not restart the slider; the user called reloadBackground.
    // We intentionally do not auto-restart here to prevent concurrent race conditions.
  }

  // ---------------------------------------------------------------------------
  //  Slider
  // ---------------------------------------------------------------------------

  /**
   * Start the background slideshow.
   * @param {number} tid - The transition ID
   */
  #startSlider(tid = this.#transitionId) {
    if (this.#destroyed) return;

    const sources = this.#options.src;
    if (!Array.isArray(sources) || sources.length === 0) {
      console.warn('[ChameleonBackgrounds] Slider mode requires an array of image URLs in `src`.');
      return;
    }

    this.#currentSlideIndex = 0;

    if (this.#hasLoadedFirstBackground) {
      if (this.#isHydrated) {
        this.#isHydrated = false;
        this.#currentSlideIndex = 1;
        if (sources.length > 1) this.#startSliderLoop();
      } else {
        // Instance already has a background, crossfade smoothly
        this.#cycleSliderSlide(sources[this.#currentSlideIndex], tid).then(() => {
          if (this.#destroyed || this.#transitionId !== tid) return;
          this.#currentSlideIndex = 1;
          if (sources.length > 1) this.#startSliderLoop();
        });
      }
    } else {
      // First load, load immediately without solid color flash
      this.#loadBackground(sources[this.#currentSlideIndex], true, this.#options.transitionMode === 'crossfade').then(() => {
        if (this.#destroyed || this.#transitionId !== tid) return;
        this.#hasLoadedFirstBackground = true;
        this.#currentSlideIndex = 1;
        if (sources.length > 1) this.#startSliderLoop();
      });
    }
  }

  #startSliderLoop() {
    if (this.#destroyed || this.#isPaused) return;

    // Parse as integers to prevent string concatenation bugs if users passed strings
    const sDuration = parseInt(this.#options.sliderDuration, 10) || 8000;

    this.#sliderIntervalId = setTimeout(() => {
      if (this.#destroyed || this.#isPaused) {
        this.#sliderIntervalId = null;
        return;
      }

      const tid = this.#transitionId;
      this.#cycleSliderSlide(this.#options.src[this.#currentSlideIndex], tid).then(() => {
        if (this.#destroyed || this.#isPaused || this.#transitionId !== tid) {
          this.#sliderIntervalId = null;
          return;
        }

        this.#currentSlideIndex++;

        if (this.#currentSlideIndex >= this.#options.src.length) {
          if (this.#options.sliderLoop) {
            this.#currentSlideIndex = 0;
          } else {
            this.#sliderIntervalId = null;
            return;
          }
        }

        this.#startSliderLoop();
      });
    }, sDuration);
  }

  /**
   * Cycle to a specific slide without resetting the slider instance.
   * @param {string|ChameleonImageConfig} src - The image URL/config to load.
   * @param {number} tid - The transition ID
   * @returns {Promise<void>}
   */
  #cycleSliderSlide(src, tid = this.#transitionId) {
    if (this.#destroyed) return Promise.resolve();

    return new Promise(resolve => {
      if (this.#options.transitionMode === 'solid') {
        const loader = this.#element.querySelector(`.cbg-loader-${this.#uid}`);
        if (loader) {
          loader.style.opacity = '1';
        }

        setTimeout(() => {
          if (this.#destroyed || this.#transitionId !== tid) return resolve();
          this.#loadBackground(src, false, false).then(resolve);
        }, this.#options.transitionDuration);
      } else {
        // Crossfade mode triggers immediately
        this.#loadBackground(src, false, true).then(resolve);
      }
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
