# ChameleonBackgrounds

A **zero-dependency** JavaScript library to dynamically load background images with elegant fade-in transitions and slideshow support.

> **v2.0** — Fully rewritten from scratch. No jQuery required.

---

## Why?

Large background images slow down initial page loads. ChameleonBackgrounds **defers loading** these images and reveals them with a smooth CSS transition once they're fully downloaded — no layout shifts, no flicker.

## Features

- 🎯 **Zero dependencies** — no jQuery, no frameworks
- 🖼️ **Single image** mode with preload + fade-in
- 🎠 **Slider** mode with configurable duration and looping
- 🎨 **Overlay** support with color, pattern images, and minimum opacity
- 🧹 **`destroy()`** method for clean teardown
- 📦 **ES Module** + **UMD** dual distribution
- 🔄 **Backward compatible** with v1 snake_case option names

---

## Installation

### Package Managers (npm / yarn / bun)

```bash
# npm
npm install chameleon-backgrounds

# yarn
yarn add chameleon-backgrounds

# bun
bun add chameleon-backgrounds
```

### CDN / Script Tag

```html
<script src="dist/chameleon-backgrounds.js"></script>
```

### ES Module

```js
import ChameleonBackgrounds from 'chameleon-backgrounds';
```

---

## Quick Start

### Single Background

```html
<script src="dist/chameleon-backgrounds.js"></script>
<script>
  const bg = new ChameleonBackgrounds({
    element: 'body',
    type: 'single',
    src: './img/chameleon.jpg',
    overlayColor: '#0f1e25',
    overlayImage: './img/transparent-tile.png', // optional
    minOverlay: 0.5,                            // optional, default: 0
    transitionDuration: 2000
  });
</script>
```

### Slider / Slideshow

```html
<div id="hero"></div>

<script src="dist/chameleon-backgrounds.js"></script>
<script>
  const bg = new ChameleonBackgrounds({
    element: '#hero',
    type: 'slider',
    src: [
      './img/image1.jpg',
      './img/image2.jpg',
      './img/image3.jpg'
    ],
    overlayColor: '#656946',
    overlayImage: './img/transparent-tile.png', // optional
    minOverlay: 0.6,                            // optional
    transitionDuration: 3000,
    sliderDuration: 4000,
    sliderLoop: true
  });
</script>
```

### ES Module Usage

```js
import ChameleonBackgrounds from 'chameleon-backgrounds';

const bg = new ChameleonBackgrounds({
  element: '#hero',
  type: 'single',
  src: '/images/hero.jpg',
  overlayColor: '#1a1a2e',
  transitionDuration: 1500
});

// Clean up when done
bg.destroy();
```

---

## Options

| Option | Type | Default | Required | Description |
|---|---|---|---|---|
| `element` | `string \| HTMLElement` | `'body'` | yes | CSS selector or DOM element to attach to |
| `type` | `'single' \| 'slider'` | `'single'` | yes | Background mode |
| `src` | `string \| string[]` | `''` | yes | Image URL (single) or array of URLs (slider) |
| `overlayColor` | `string` | `'#0f1e25'` | yes | Overlay color (hex, rgb, rgba, hsl) |
| `overlayImage` | `string \| null` | `null` | no | Overlay pattern image URL |
| `minOverlay` | `number` | `0` | no | Minimum overlay opacity after fade (0–1) |
| `transitionDuration` | `number` | `2000` | yes | Fade duration in milliseconds |
| `sliderDuration` | `number` | `8000` | slider only | Time each slide is shown (ms) |
| `sliderLoop` | `boolean` | `false` | slider only | Restart slider after last slide |

### Legacy Option Names

For backward compatibility, v1 snake_case option names are still supported:

| v1 (snake_case) | v2 (camelCase) |
|---|---|
| `transition_duration` | `transitionDuration` |
| `slider_duration` | `sliderDuration` |
| `slider_loop` | `sliderLoop` |
| `min_overlay` | `minOverlay` |
| `overlay_color` | `overlayColor` |
| `overlay_image` | `overlayImage` |

---

## API

### `new ChameleonBackgrounds(options)`

Creates a new instance and immediately begins loading.

### `.destroy()`

Stops any running slider, removes all injected DOM and styles, and restores the target element to its original state.

### `.getOptions()` / `.options` (ESM)

Returns a read-only copy of the resolved options.

### `.reloadOptions(newOptions)`

Update options on the fly without destroying the instance. For example, you can change the transition duration or even convert a single background into a slider dynamically:
```javascript
bg.reloadOptions({
  type: 'slider',
  src: [
    './img/slide1.jpg',
    './img/slide2.jpg'
  ],
  transitionDuration: 5000,
  overlayColor: '#ff0000'
});
// To apply the updated options, simply reload the background
bg.reloadBackground();
```

---

## Migration from v1

1. **Remove jQuery** — ChameleonBackgrounds v2 uses native DOM APIs.
2. **Rename options** (optional) — snake_case names still work, but camelCase is now preferred.
3. **Use `new`** — `new ChameleonBackgrounds(options)` works identically to v1.
4. **Clean up** — Call `.destroy()` when removing the background (new in v2).

```diff
- <script src="jquery.min.js"></script>
- <script src="chameleonbackgrounds.js"></script>
+ <script src="dist/chameleon-backgrounds.js"></script>

  <script>
-   var options = {
+   const options = {
      element: 'body',
      type: 'single',
      src: './img/chameleon.jpg',
      overlayColor: '#0f1e25',
-     transition_duration: 2000
+     transitionDuration: 2000
    };

-   background = new ChameleonBackgrounds(options);
+   const background = new ChameleonBackgrounds(options);
  </script>
```

---

## Tips

- **Transparent patterns** work great as `overlayImage` — combine with `overlayColor` and `minOverlay` for cohesive designs across different background images.
- Find awesome transparent patterns at [transparenttextures.com](https://www.transparenttextures.com/).

---

## License

[MIT](./LICENSE) © [Lennart van Ballegoij](https://weblenn.com/)
