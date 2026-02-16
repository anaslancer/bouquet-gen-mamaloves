import type { CharmShape } from '@shared/schema';
import { Point } from './types';

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

type FlowerAsset = {
  path: string;
  transformCenter: Point;
  baseRotation: number;
};

export const FLOWER_FILES: Record<
  string,
  { left: FlowerAsset; center: FlowerAsset; right: FlowerAsset }
> = {
  january: {
    left: {
      path: 'january_mostly_used_left.svg',
      transformCenter: { x: 0.615, y: 0.785 },
      baseRotation: -7.0,
    },
    center: {
      path: 'january_mostly_used_left.svg',
      transformCenter: { x: 0.6, y: 0.8 },
      baseRotation: -6.0,
    },
    right: {
      path: 'january_mirrored_mostly_used_right.svg',
      transformCenter: { x: 0.399, y: 0.816 },
      baseRotation: 5.0,
    },
  },
  february: {
    left: {
      path: 'february_single_flower_mirrored_leaf_left_side.svg',
      transformCenter: { x: 0.355, y: 0.842 },
      baseRotation: -19.0,
    },
    center: {
      path: 'february_mirrored_leaf_right_side.svg',
      transformCenter: { x: 0.3, y: 0.798 },
      baseRotation: -26.0,
    },
    right: {
      path: 'february_leaf_right_side.svg',
      transformCenter: { x: 0.7, y: 0.81 },
      baseRotation: 25.5,
    },
  },
  march: {
    left: {
      path: 'march_single_flower_mirrored.svg',
      transformCenter: { x: 0.914, y: 0.816 },
      baseRotation: -2.0,
    },
    center: {
      path: 'march_single_flower.svg',
      transformCenter: { x: 0.089, y: 0.838 },
      baseRotation: -1.5,
    },
    right: {
      path: 'march_single_flower.svg',
      transformCenter: { x: 0.114, y: 0.796 },
      baseRotation: 3.0,
    },
  },
  april: {
    left: {
      path: 'april_mostly_used_left.svg',
      transformCenter: { x: 0.782, y: 0.792 },
      baseRotation: 0,
    },
    center: {
      path: 'april_mostly_used_left.svg',
      transformCenter: { x: 0.837, y: 0.82 },
      baseRotation: 0,
    },
    right: {
      path: 'april_mirrored_mostly_used_right.svg',
      transformCenter: { x: 0.173, y: 0.84 },
      baseRotation: 0,
    },
  },
  may: {
    left: {
      path: 'may_mirrored_with_leaf_left.svg',
      transformCenter: { x: 0.345, y: 0.764 },
      baseRotation: -7.5,
    },
    center: {
      path: 'may_without_leafs.svg',
      transformCenter: { x: 0.686, y: 0.78 },
      baseRotation: 16.5,
    },
    right: {
      path: 'may_with_leaf_right.svg',
      transformCenter: { x: 0.628, y: 0.764 },
      baseRotation: 22.0,
    },
  },
  june: {
    left: {
      path: 'june_single_flower.svg',
      transformCenter: { x: 0.342, y: 0.752 },
      baseRotation: -23.0,
    },
    center: {
      path: 'june_single_flower.svg',
      transformCenter: { x: 0.343, y: 0.752 },
      baseRotation: -21.5,
    },
    right: {
      path: 'june_single_flower_mirrored.svg',
      transformCenter: { x: 0.657, y: 0.75 },
      baseRotation: 25.5,
    },
  },
  july: {
    left: {
      path: 'july_mirrored.svg',
      transformCenter: { x: 0.764, y: 0.676 },
      baseRotation: 0,
    },
    center: {
      path: 'july.svg',
      transformCenter: { x: 0.224, y: 0.722 },
      baseRotation: 2.0,
    },
    right: {
      path: 'july.svg',
      transformCenter: { x: 0.224, y: 0.692 },
      baseRotation: 2.0,
    },
  },
  august: {
    left: {
      path: 'august_single_flower.svg',
      transformCenter: { x: 0.809, y: 0.786 },
      baseRotation: 0,
    },
    center: {
      path: 'august_mirrored.svg',
      transformCenter: { x: 0.415, y: 0.762 },
      baseRotation: 0,
    },
    right: {
      path: 'august_single_flower_mirrored.svg',
      transformCenter: { x: 0.19, y: 0.778 },
      baseRotation: 0,
    },
  },
  september: {
    left: {
      path: 'september_mirrored.svg',
      transformCenter: { x: 0.662, y: 0.736 },
      baseRotation: -5.0,
    },
    center: {
      path: 'september.svg',
      transformCenter: { x: 0.367, y: 0.762 },
      baseRotation: 2.0,
    },
    right: {
      path: 'september.svg',
      transformCenter: { x: 0.327, y: 0.706 },
      baseRotation: 4.5,
    },
  },
  october: {
    left: {
      path: 'october_single_flower.svg',
      transformCenter: { x: 0.494, y: 0.828 },
      baseRotation: -2.0,
    },
    center: {
      path: 'october_single_flower.svg',
      transformCenter: { x: 0.494, y: 0.828 },
      baseRotation: 0,
    },
    right: {
      path: 'october_single_flower_mirrored.svg',
      transformCenter: { x: 0.494, y: 0.828 },
      baseRotation: 0,
    },
  },
  november: {
    left: {
      path: 'november_less_leafs.svg',
      transformCenter: { x: 0.547, y: 0.822 },
      baseRotation: 0,
    },
    center: {
      path: 'november_less_leafs.svg',
      transformCenter: { x: 0.547, y: 0.824 },
      baseRotation: 0,
    },
    right: {
      path: 'november_less_leafs_mirrored.svg',
      transformCenter: { x: 0.443, y: 0.82 },
      baseRotation: 7.0,
    },
  },
  december: {
    left: {
      path: 'december_with_less_leafs.svg',
      transformCenter: { x: 0.68, y: 0.826 },
      baseRotation: -6.0,
    },
    center: {
      path: 'december_with_less_leafs_mirrored.svg',
      transformCenter: { x: 0.298, y: 0.8 },
      baseRotation: -6.0,
    },
    right: {
      path: 'december_with_less_leafs_mirrored.svg',
      transformCenter: { x: 0.315, y: 0.792 },
      baseRotation: 8.0,
    },
  },
};

export const LAYOUT_ANGLES: Record<number, number[]> = {
  1: [0],
  2: [-20, 20],
  3: [-25, 0, 25],
  4: [-40, -15, 15, 40],
  5: [-50, -20, 0, 20, 50],
};

export const BASE_FLOWER_HEIGHT = 270;

export const SPREAD_MULTIPLIER: Record<CharmShape, number> = {
  coin: 1.0,
  round: 1.0,
  oval: 1.0,
  heart: 1.0,
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
    bindingPointY: 0.8,
    scaleX: 0.9,
    scaleY: 0.9,
  },
  round: {
    bindingPointX: 0.5,
    bindingPointY: 0.8,
    scaleX: 1.1,
    scaleY: 1.8,
  },
  oval: {
    bindingPointX: 0.5,
    bindingPointY: 0.8,
    scaleX: 1,
    scaleY: 1,
  },
  heart: {
    bindingPointX: 0.5,
    bindingPointY: 0.8,
    scaleX: 1,
    scaleY: 1,
  },
};

export const SVG_CONFIG = {
  viewBoxWidth: 400,
  viewBoxHeight: 400,
  strokeColor: '#000000',
  strokeWidth: 4,
};
