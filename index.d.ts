export interface ChameleonBackgroundsOptions {
  element?: string | Element;
  type?: 'single' | 'slider';
  src?: string | string[] | { url: string, srcset?: string, sizes?: string };
  overlayColor?: string;
  overlayImage?: string;
  minOverlay?: number;
  transitionDuration?: number;
  sliderDuration?: number;
  sliderLoop?: boolean;
  lazyLoad?: boolean;
  fetchPriority?: 'high' | 'low' | 'auto';
  transitionMode?: 'opacity' | 'crossfade';
  respectReducedMotion?: boolean;
}

export default class ChameleonBackgrounds {
  constructor(options: ChameleonBackgroundsOptions);
  reloadBackground(src?: string | string[] | { url: string, srcset?: string, sizes?: string }): void;
  reloadOptions(options: Partial<ChameleonBackgroundsOptions>): void;
  destroy(): void;
  pause(): void;
  play(): void;
}
