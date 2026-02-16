import type { CharmShape } from '@shared/schema';
import type { FlowerSlot, FlowerSVG, LayoutTemplate, Point } from './types';
import {
  LAYOUT_ANGLES,
  SVG_CONFIG,
  SPREAD_MULTIPLIER,
  CHARM_SHAPE_CONFIG,
} from './constants';

export function getFlowerPosition(
  slotIndex: number,
  totalSlots: number,
): 'left' | 'center' | 'right' {
  if (totalSlots === 1) return 'center';
  const centerIndex = (totalSlots - 1) / 2;
  if (slotIndex < centerIndex) return 'left';
  if (slotIndex > centerIndex) return 'right';
  return 'center';
}

export function generateLayout(
  flowers: Array<FlowerSVG | null>,
  charmShape: CharmShape,
): LayoutTemplate {
  const { viewBoxWidth, viewBoxHeight } = SVG_CONFIG;
  const config = CHARM_SHAPE_CONFIG[charmShape] ?? CHARM_SHAPE_CONFIG.coin;

  const bindingPoint: Point = {
    x: viewBoxWidth * config.bindingPointX,
    y: viewBoxHeight * config.bindingPointY,
  };

  const flowerCount = flowers.length;
  const baseAngles = LAYOUT_ANGLES[flowerCount] || LAYOUT_ANGLES[3];
  const spreadMult = SPREAD_MULTIPLIER[charmShape] || 1.0;

  const slots: FlowerSlot[] = baseAngles.map((baseAngle, index) => {
    const flower = flowers[index];
    let angle = baseAngle * spreadMult + (flower?.baseRotation ?? 0);

    const transformCenter = flower?.transformCenter
      ? {
          x: flower.transformCenter.x * flower.width,
          y: flower.transformCenter.y * flower.height,
        }
      : {
          x: (flower?.width ?? 0) / 2,
          y: (flower?.height ?? 0) * 0.75,
        };

    return {
      position: {
        x: bindingPoint.x - transformCenter.x,
        y: bindingPoint.y - transformCenter.y,
      },
      rotation: angle,
    };
  });

  return {
    flowerCount,
    bindingPoint,
    slots,
    viewBox: { width: viewBoxWidth, height: viewBoxHeight },
  };
}
