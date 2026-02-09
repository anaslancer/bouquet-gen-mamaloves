/**
 * Constants for bouquet generation
 */

import type { CharmShape } from '@shared/schema';

// Month to flower name mapping (Dutch -> English)
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

type FlowerAsset = string | { path: string; angle: number };
export const FLOWER_FILES: Record<
  string,
  { left: FlowerAsset; center: FlowerAsset; right: FlowerAsset }
> = {
  january: {
    left: 'january_simple_mostly_used_in_the_middle.svg',
    center: 'january_simple_mostly_used_in_the_middle.svg',
    right: 'january_mirrored_mostly_used_right.svg',
  },
  february: {
    left: 'february_mirrored_leaf_left_side.svg',
    center: 'february_flower.svg',
    right: 'february_leaf_right_side.svg',
  },
  march: {
    left: 'march_single_flower.svg',
    center: 'march_flower.svg',
    right: 'march_single_flower_mirrored.svg',
  },
  april: {
    left: 'april_mostly_used_left.svg',
    center: 'april_mostly_used_left.svg',
    right: 'april_mirrored_mostly_used_right.svg',
  },
  may: {
    left: 'may.svg',
    center: 'may_without_leafs.svg',
    right: 'may_mirrored.svg',
  },
  june: {
    left: 'june_single_flower.svg',
    center: 'june_single_flower.svg',
    right: 'june_single_flower_mirrored.svg',
  },
  july: {
    left: 'july_single_flower.svg',
    center: 'july.svg',
    right: 'july_single_flower_mirrored.svg',
  },
  august: {
    left: 'august_single_flower.svg',
    center: 'august.svg',
    right: 'august_single_flower_mirrored.svg',
  },
  september: {
    left: 'september_simpel.svg',
    center: 'september.svg',
    right: 'september_simpel_mirrored.svg',
  },
  october: {
    left: 'october_single_flower.svg',
    center: 'october.svg',
    right: 'october_single_flower_mirrored.svg',
  },
  november: {
    left: 'november_less_leafs.svg',
    center: 'november.svg',
    right: 'november_less_leafs_mirrored.svg',
  },
  december: {
    left: 'december_single_flower.svg',
    center: 'december.svg',
    right: 'december_single_flower_mirrored.svg',
  },
};

// Angular spread based on flower count (degrees from vertical)
// Each flower is rotated around its stem base by this angle
export const LAYOUT_ANGLES: Record<number, number[]> = {
  1: [0],
  2: [-25, 25],
  3: [-30, 0, 30],
  4: [-40, -15, 15, 40],
  5: [-45, -22, 0, 22, 45],
};

// Target height for all flowers after scaling (in output SVG units)
export const BASE_FLOWER_HEIGHT = 250;

// Spread multiplier for different charm shapes
// Adjusts the angular spread to fit the engraving shape
export const SPREAD_MULTIPLIER: Record<CharmShape, number> = {
  coin: 1.0,
  round: 0.9,
  oval: 0.65,
  heart: 0.85,
};

// Per-file stem base overrides as fractions of (width, height)
// Default for all flowers is { x: 0.5, y: 1.0 } (bottom center)
// Only override here if the stem is significantly off-center
export const STEM_BASE_OVERRIDES: Record<string, { x: number; y: number }> = {
  'february_leaf_right_side.svg': { x: 0.71, y: 1.0 },
};

// SVG output settings
export const SVG_CONFIG = {
  viewBoxWidth: 400,
  viewBoxHeight: 400,
  strokeColor: '#000000',
  strokeWidth: 4,
};
