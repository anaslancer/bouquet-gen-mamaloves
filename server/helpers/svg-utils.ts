import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import type { CharmShape } from '@shared/schema';
import type { FlowerSVG, FlowerSlot, LayoutTemplate, Point } from './types';

import {
  FLOWER_FILES,
  MONTH_TO_FLOWER,
  SVG_CONFIG,
  BASE_FLOWER_HEIGHT,
  CHARM_SHAPE_CONFIG,
} from './constants';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ASSETS_PATH = path.join(__dirname, '../../assets/flowers');

function removeBackgroundPath(svgContent: string): string {
  return svgContent.replace(/<g>\s*<path[^>]*Z"\s*\/?>\s*<\/g>/i, '');
}

function convertToStrokeOnly(content: string): string {
  let result = content;

  result = result.replace(/fill="[^"]*"/g, 'fill="none"');
  result = result.replace(/fill:[^;"]*/g, 'fill:none');
  // Remove inline stroke-width from style so normalized stroke-width attribute can take effect.
  result = result.replace(/style="([^"]*)"/g, (_match, styleBody: string) => {
    const cleaned = styleBody
      .replace(/(^|;)\s*stroke-width\s*:\s*[^;"]*/gi, '$1')
      .replace(/;;+/g, ';')
      .replace(/^;|;$/g, '')
      .trim();
    return cleaned ? `style="${cleaned}"` : '';
  });

  result = result.replace(/<path([^>]*)>/g, (match, attrs) => {
    if (attrs.includes('stroke=')) return match;
    const strokeAttr = ` stroke="${SVG_CONFIG.strokeColor}" stroke-width="${SVG_CONFIG.strokeWidth}"`;
    const cleanAttrs = attrs.replace(/\s*\/\s*$/g, '');
    return `<path${cleanAttrs}${strokeAttr} />`;
  });

  result = result.replace(
    /stroke="none"/g,
    `stroke="${SVG_CONFIG.strokeColor}"`,
  );

  // Normalize stroke-width + add non-scaling-stroke so strokes ignore all transforms
  // (parseSVG scale, per-flower scaleX/Y, layout scaleW/H)
  result = result.replace(
    /stroke-width="[^"]*"/g,
    `stroke-width="${SVG_CONFIG.strokeWidth}" vector-effect="non-scaling-stroke"`,
  );

  return result;
}

function parseSVG(svgContent: string): FlowerSVG {
  let origWidth = 100,
    origHeight = 100;

  const widthMatch = svgContent.match(/width="([\d.]+)(px)?"/i);
  const heightMatch = svgContent.match(/height="([\d.]+)(px)?"/i);

  if (widthMatch && heightMatch) {
    origWidth = parseFloat(widthMatch[1]);
    origHeight = parseFloat(heightMatch[1]);
  } else {
    const viewBoxMatch = svgContent.match(/viewBox="([^"]+)"/i);
    if (viewBoxMatch) {
      const parts = viewBoxMatch[1].trim().split(/\s+/);
      if (parts.length === 4) {
        origWidth = parseFloat(parts[2]);
        origHeight = parseFloat(parts[3]);
      }
    }
  }

  svgContent = removeBackgroundPath(svgContent);

  let content: string;
  const gMatch = svgContent.match(/<g[^>]*>([\s\S]*)<\/g>/i);
  if (gMatch) {
    content = gMatch[0];
  } else {
    const svgMatch = svgContent.match(/<svg[^>]*>([\s\S]*)<\/svg>/i);
    content = svgMatch ? svgMatch[1] : '';
  }

  const scaleFactor = BASE_FLOWER_HEIGHT / origHeight;
  const normalizedWidth = origWidth * scaleFactor;

  content = convertToStrokeOnly(content);

  content = `<g transform="scale(${scaleFactor.toFixed(6)})">${content}</g>`;

  return {
    content,
    width: normalizedWidth,
    height: BASE_FLOWER_HEIGHT,
  };
}

export function loadFlowerSVG(
  month: string,
  position: 'left' | 'center' | 'right' | 'center_left' | 'center_right',
): FlowerSVG | null {
  const flowerName = MONTH_TO_FLOWER[month];
  if (!flowerName) {
    console.error(`Unknown month: ${month}`);
    return null;
  }

  const fileMapping = FLOWER_FILES[flowerName];
  if (!fileMapping) {
    console.error(`No file mapping for: ${flowerName}`);
    return null;
  }

  const posConfig = fileMapping[position];
  const svgInfo = posConfig?.base
    ? { ...fileMapping[posConfig.base], ...posConfig }
    : { ...(posConfig ?? {}) };

  if (!svgInfo.path) {
    console.error(`No path for: ${flowerName} position ${position}`);
    return null;
  }
  const fileName = svgInfo.path;
  const filePath = path.join(ASSETS_PATH, fileName);

  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const parsed = parseSVG(content);

    parsed.transformCenter = svgInfo.transformCenter;
    parsed.baseRotation = svgInfo.baseRotation;
    parsed.flowerPoly = svgInfo.flowerPoly ?? [];

    // Apply per-flower scale (default 1) to normalize size across flowers
    const scaleX = svgInfo.scaleX ?? 1;
    const scaleY = svgInfo.scaleY ?? 1;
    if (scaleX !== 1 || scaleY !== 1) {
      parsed.content = `<g transform="scale(${scaleX}, ${scaleY})">${parsed.content}</g>`;
      parsed.width *= scaleX;
      parsed.height *= scaleY;
    }

    return parsed;
  } catch (error) {
    console.error(`Failed to load: ${filePath}`);
    return null;
  }
}

export function checkAssetsExist(): boolean {
  try {
    const files = fs.readdirSync(ASSETS_PATH);
    return files.length > 0;
  } catch {
    return false;
  }
}

/** Get flowerPoly vertices in world space (after position + rotation) */
function getTransformedPolygonPoints(
  flower: FlowerSVG,
  slot: FlowerSlot,
  bindingPoint: Point,
): Point[] | null {
  const poly = flower.flowerPoly;
  if (!poly || poly.length < 3) return null;
  const { position, rotation, scaleW, scaleH } = slot;
  const angleRad = (rotation * Math.PI) / 180;
  const cos = Math.cos(angleRad);
  const sin = Math.sin(angleRad);
  const bx = bindingPoint.x;
  const by = bindingPoint.y;
  const w = flower.width * scaleW;
  const h = flower.height * scaleH;
  return poly.map((p) => {
    const x = position.x + p.x * w;
    const y = position.y + p.y * h;
    const dx = x - bx;
    const dy = y - by;
    return {
      x: bx + dx * cos - dy * sin,
      y: by + dx * sin + dy * cos,
    };
  });
}

function segmentIntersect(a1: Point, a2: Point, b1: Point, b2: Point): boolean {
  const dx1 = a2.x - a1.x;
  const dy1 = a2.y - a1.y;
  const dx2 = b2.x - b1.x;
  const dy2 = b2.y - b1.y;
  const denom = dx1 * dy2 - dy1 * dx2;
  const eps = 1e-9;
  if (Math.abs(denom) < eps) return false;
  const s = ((b1.x - a1.x) * dy2 - (b1.y - a1.y) * dx2) / denom;
  const t = ((b1.x - a1.x) * dy1 - (b1.y - a1.y) * dx1) / denom;
  return s >= 0 && s <= 1 && t >= 0 && t <= 1;
}

/** Get edges of a polygon: (p0,p1), (p1,p2), ..., (pN-1,p0) */
function getPolygonEdges(pts: Point[]): [Point, Point][] {
  const edges: [Point, Point][] = [];
  for (let i = 0; i < pts.length; i++) {
    edges.push([pts[i], pts[(i + 1) % pts.length]]);
  }
  return edges;
}

function polygonsCollide(ptsA: Point[], ptsB: Point[]): boolean {
  const edgesA = getPolygonEdges(ptsA);
  const edgesB = getPolygonEdges(ptsB);
  for (const [a1, a2] of edgesA) {
    for (const [b1, b2] of edgesB) {
      if (segmentIntersect(a1, a2, b1, b2)) return true;
    }
  }
  return false;
}

export function resolveCollisions(
  layout: LayoutTemplate,
  flowers: Array<FlowerSVG | null>,
  bindingPoint: Point,
): LayoutTemplate {
  const slots = layout.slots.map((s) => ({ ...s, rotation: s.rotation }));

  function getTransformedPoly(
    index: number,
    offsetAngle?: number,
  ): Point[] | null {
    const flower = flowers[index];
    if (!flower) return null;
    return getTransformedPolygonPoints(
      flower,
      {
        position: layout.slots[index].position,
        rotation: slots[index].rotation + (offsetAngle ?? 0),
        scaleW: layout.slots[index].scaleW,
        scaleH: layout.slots[index].scaleH,
      },
      bindingPoint,
    );
  }

  const centerF = flowers.length / 2;
  const centerIndex = Math.floor(centerF);

  for (let i = centerIndex - 1; i >= 0; i--) {
    const myPoly = getTransformedPoly(i);
    if (!myPoly) continue;
    let iter = 0;
    let leftAngle = 0;
    while (iter < 30 * (centerIndex - i)) {
      const myPts = getTransformedPoly(i)!;
      const refPts = getTransformedPoly(i + 1)!;

      if (polygonsCollide(myPts, refPts)) {
        if (i === centerIndex && centerF - centerIndex > 1e-4) {
          slots[i].rotation -= 1.0;
          slots[i + 1].rotation += 1.0;
          leftAngle += 1.0;
        } else {
          slots[i].rotation -= 2.0;
          leftAngle += 2.0;
        }
      } else {
        break;
      }

      iter++;
    }
  }

  for (let i = centerIndex + 1; i < flowers.length; i++) {
    let iter = 0;
    let rightAngle = 0;
    while (iter < 30 * (i - centerIndex)) {
      const myPts = getTransformedPoly(i)!;
      const refPts = getTransformedPoly(i - 1)!;

      if (polygonsCollide(myPts, refPts)) {
        slots[i].rotation += 2.0;
        rightAngle += 2.0;
      } else {
        break;
      }

      iter++;
    }
  }

  return { ...layout, slots };
}

function transformFlower(
  flower: FlowerSVG,
  slot: FlowerSlot,
  bindingPoint: Point,
  index: number,
): string {
  const { rotation, position, scaleW, scaleH } = slot;
  const needsScale = scaleW !== 1 || scaleH !== 1;
  const scaleAttr = needsScale
    ? ` scale(${scaleW.toFixed(4)}, ${scaleH.toFixed(4)})`
    : '';
  return `
    <g id="flower-${index}"
       transform="rotate(${rotation.toFixed(2)}, ${bindingPoint.x}, ${bindingPoint.y}) translate(${position.x.toFixed(2)}, ${position.y.toFixed(2)})${scaleAttr}">
      ${flower.content}
    </g>`;
  // return `
  //   <g id="flower-${index}"
  //      transform="rotate(${rotation.toFixed(2)}, ${bindingPoint.x}, ${bindingPoint.y}) translate(${position.x.toFixed(2)}, ${position.y.toFixed(2)})${scaleAttr}">
  //     <rect x="0" y="0" width="${flower.width.toFixed(2)}" height="${flower.height.toFixed(2)}" fill="none" stroke="red" stroke-width="1" stroke-dasharray="4 2" pointer-events="none"/>
  //     ${flower.content}
  //   </g>`;
}

function localToWorld(
  localPt: Point,
  slot: FlowerSlot,
  bindingPoint: Point,
): Point {
  const { position, rotation, scaleW, scaleH } = slot;
  const x = position.x + localPt.x * scaleW;
  const y = position.y + localPt.y * scaleH;
  const angleRad = (rotation * Math.PI) / 180;
  const cos = Math.cos(angleRad);
  const sin = Math.sin(angleRad);
  const dx = x - bindingPoint.x;
  const dy = y - bindingPoint.y;
  return {
    x: bindingPoint.x + dx * cos - dy * sin,
    y: bindingPoint.y + dx * sin + dy * cos,
  };
}

export function balanceFlowerAngles(
  layout: LayoutTemplate,
  flowers: Array<FlowerSVG | null>,
): LayoutTemplate {
  const { bindingPoint } = layout;
  const firstSlot = layout.slots[0];
  const lastSlot = layout.slots[layout.slots.length - 1];
  const lastFlower = flowers[flowers.length - 1] ?? {
    width: 0,
    height: 0,
  };
  const mostLeftCorner = localToWorld({ x: 0, y: 0 }, firstSlot, bindingPoint);
  const mostRightCorner = localToWorld(
    { x: lastFlower?.width ?? 0, y: 0 },
    lastSlot,
    bindingPoint,
  );

  const xOffset = mostRightCorner.x - mostLeftCorner.x;
  const yOffset = mostRightCorner.y - mostLeftCorner.y;

  const alphaRad = Math.atan2(yOffset, xOffset);
  const alphaDeg = alphaRad * (180 / Math.PI);

  const slots = layout.slots.map((s) => ({ ...s, rotation: s.rotation }));
  const n = slots.length;
  const centerIndex = (n - 1) / 2;

  // Apply correction proportionally: center flower(s) stay straight, outer flowers absorb the tilt
  for (let i = 0; i < n; i++) {
    const distFromCenter = Math.abs(i - centerIndex);
    const maxDist = centerIndex || 1;
    const weight = distFromCenter / maxDist;
    slots[i].rotation -= alphaDeg * weight;
  }
  return { ...layout, slots };
}

function buildPolyOverlay(
  flower: FlowerSVG,
  slot: FlowerSlot,
  bindingPoint: Point,
  index: number,
): string {
  const pts = getTransformedPolygonPoints(flower, slot, bindingPoint);
  if (!pts) return '';
  const colors = ['red', 'blue', 'green', 'orange', 'purple'];
  const color = colors[index % colors.length];
  const points = pts
    .map((p) => `${p.x.toFixed(2)},${p.y.toFixed(2)}`)
    .join(' ');
  return `<polygon id="poly-${index}" points="${points}" fill="${color}" fill-opacity="0.3" stroke="${color}" stroke-width="1" pointer-events="none"/>`;
}

export function composeBouquet(
  layout: LayoutTemplate,
  flowers: Array<FlowerSVG | null>,
  charmShape: CharmShape,
): string {
  const { viewBox, bindingPoint } = layout;
  console.log(viewBox, bindingPoint);
  const config = CHARM_SHAPE_CONFIG[charmShape] ?? CHARM_SHAPE_CONFIG.coin;

  const flowersContent = flowers
    .map((flower, index) =>
      flower
        ? transformFlower(flower, layout.slots[index], bindingPoint, index)
        : '',
    )
    .join('\n');

  // const polyOverlays = flowers
  //   .map((flower, index) =>
  //     flower
  //       ? buildPolyOverlay(flower, layout.slots[index], bindingPoint, index)
  //       : '',
  //   )
  //   .filter(Boolean)
  //   .join('\n');
  const polyOverlays = '';

  const cx = viewBox.width / 2;
  const cy = viewBox.height / 2;

  const needsScale = config.scaleX !== 1 || config.scaleY !== 1;

  let vbX = 0,
    vbY = 0,
    vbW = viewBox.width,
    vbH = viewBox.height;

  const scaleAttr = needsScale
    ? ` transform="translate(${cx}, ${cy}) scale(${config.scaleX}, ${config.scaleY}) translate(${-cx}, ${-cy})"`
    : '';

  // const viewBoxRect =
  //   charmShape === 'poster'
  //     ? `<rect x="${vbX}" y="${vbY}" width="${vbW}" height="${vbH}" fill="rgba(200,200,200,0.2)" stroke="#666" stroke-width="2"/>`
  //     : '';
  const viewBoxRect = '';

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" version="1.1"
     viewBox="${vbX} ${vbY} ${vbW} ${vbH}"
     width="${viewBox.width}px" height="${viewBox.height}px">
  ${viewBoxRect}
  <g id="bouquet"${scaleAttr}>
    <g id="flowers">
    ${flowersContent}
    </g>
    <g id="debug-polys">
    ${polyOverlays}
    </g>
  </g>
</svg>`;
}
