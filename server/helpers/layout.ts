import type { CharmShape } from '@shared/schema';
import type { FlowerSlot, FlowerSVG, LayoutTemplate, Point } from './types';
import {
  LAYOUT_ANGLES,
  SVG_CONFIG,
  SPREAD_MULTIPLIER,
} from './constants';

/**
 * Determine which flower variant to use based on position in the bouquet.
 * Left-most flowers get 'left' variants, center gets 'center', right-most get 'right'.
 */
export function getFlowerPosition(
  slotIndex: number,
  totalSlots: number,
): 'left' | 'center' | 'right' {
  if (totalSlots === 1) return 'center';
  const centerIndex = (totalSlots - 1) / 2;
  if (slotIndex < centerIndex - 0.5) return 'left';
  if (slotIndex > centerIndex + 0.5) return 'right';
  return 'center';
}

/**
 * Generate layout template for a bouquet using the stem-base rotation approach.
 *
 * All flowers share a single binding point (the convergence point of all stems).
 * Each flower is rotated around its stem base (which maps to the binding point)
 * by the layout angle for its slot position. This creates a natural fan effect
 * where stems radiate outward from the binding point.
 *
 * The spread multiplier adjusts the angular range to fit different charm shapes
 * (e.g., oval shapes need a narrower spread than coin shapes).
 */
export function generateLayout(
  flowers: Array<FlowerSVG | null>,
  charmShape: CharmShape,
): LayoutTemplate {
  const { viewBoxWidth, viewBoxHeight } = SVG_CONFIG;

  // Binding point: where all stems converge (lower-center of the output)
  const bindingPoint: Point = {
    x: viewBoxWidth / 2,
    y: viewBoxHeight * 0.83,
  };

  const flowerCount = flowers.length;
  const baseAngles = LAYOUT_ANGLES[flowerCount] || LAYOUT_ANGLES[3];
  const spreadMult = SPREAD_MULTIPLIER[charmShape] || 1.0;

  const slots: FlowerSlot[] = baseAngles.map((baseAngle, index) => {
    const flower = flowers[index];

    // Apply spread multiplier for charm shape
    let angle = baseAngle * spreadMult;

    // Add per-flower rotation offset if defined (for flowers with natural stem tilt)
    if (flower?.rotation) {
      angle += flower.rotation;
    }

    return {
      position: { ...bindingPoint },
      angle,
      tilt: angle,
      scale: 1,
    };
  });

  return {
    flowerCount,
    bindingPoint,
    slots,
    viewBox: { width: viewBoxWidth, height: viewBoxHeight },
  };
}
