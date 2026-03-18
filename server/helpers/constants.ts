import type { CharmShape } from '@shared/schema';

export const MONTH_TO_FLOWER: Record<string, string> = {
  Januari: 'january',
  Februari: 'february',
  Maart: 'march',
  April: 'april',
  Mei: 'may',
  Juni: 'june',
  Juli: 'july',
  Augustus: 'august',
  September: 'september',
  Oktober: 'october',
  November: 'november',
  December: 'december',
};

export const LAYOUT_ANGLES: Record<number, number[]> = {
  1: [0],
  2: [-15, 15],
  3: [-30, 0, 30],
  4: [-20, -6, 6, 20],
  5: [-18, -8, 0, 8, 18],
};

export const LAYOUT_SCALE: Record<number, { w: number; h: number }[]> = {
  1: [{ w: 1.0, h: 1.0 }],
  2: [
    { w: 1.0, h: 1.0 },
    { w: 1.0, h: 1.0 },
  ],
  3: [
    { w: 1.0, h: 1.0 },
    { w: 1.0, h: 1.0 },
    { w: 1.0, h: 1.0 },
  ],
  4: [
    { w: 0.9, h: 0.9 },
    { w: 1.0, h: 1.0 },
    { w: 1.0, h: 1.0 },
    { w: 0.9, h: 0.9 },
  ],
  5: [
    { w: 0.8, h: 0.8 },
    { w: 1.0, h: 1.0 },
    { w: 1.0, h: 1.0 },
    { w: 1.0, h: 1.0 },
    { w: 0.8, h: 0.8 },
  ],
};

export const BASE_FLOWER_HEIGHT = 200;

export const SVG_CONFIG = {
  viewBoxWidth: 400,
  viewBoxHeight: 400,
  strokeColor: '#000000',
  strokeWidth: 0.8,
};

export const SPREAD_MULTIPLIER: Record<CharmShape, number> = {
  coin: 1.0,
  round: 1.0,
  oval: 1.0,
  heart: 1.0,
  poster: 1.0,
};

export type CharmShapeConfig = {
  bindingPointX: number;
  bindingPointY: number;
  scaleX: number;
  scaleY: number;
};

export const CHARM_SHAPE_CONFIG: Record<CharmShape, CharmShapeConfig> = {
  coin: {
    bindingPointX: 0.5,
    bindingPointY: 0.75,
    scaleX: 1,
    scaleY: 1,
  },
  oval: {
    bindingPointX: 0.5,
    bindingPointY: 0.74,
    scaleX: 1.4,
    scaleY: 2.2,
  },
  round: {
    bindingPointX: 0.5,
    bindingPointY: 0.66,
    scaleX: 1.2,
    scaleY: 1.1,
  },
  heart: {
    bindingPointX: 0.5,
    bindingPointY: 0.66,
    scaleX: 0.9,
    scaleY: 0.9,
  },
  poster: {
    bindingPointX: 0.5,
    bindingPointY: 0.63,
    scaleX: 1.45,
    scaleY: 1.45,
    // scaleX: SVG_CONFIG.viewBoxWidth / BASE_FLOWER_HEIGHT,
    // scaleY: SVG_CONFIG.viewBoxHeight / BASE_FLOWER_HEIGHT,
  },
};

export { FLOWER_FILES } from './flower_constants';

/** Shopify checkout property names for poster text (configurable) */
export const POSTER_TITLE_PROP = 'Poster titel';
export const POSTER_NAMES_PROP = 'Namen';
