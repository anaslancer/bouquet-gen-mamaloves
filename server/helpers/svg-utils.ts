import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import type { CharmShape } from '@shared/schema';
import type {
  FlowerSVG,
  FlowerSlot,
  LayoutTemplate,
  Point,
  FlowerRegion,
} from './types';

const COLLISION_ANGLE_STEP = 3.0;
const COLLISION_ANGLE_BUFFER = 2; // Extra steps after clearing collision for minimum spacing
const MAX_COLLISION_ITERATIONS = 15;
// Only check collision in the top N% of each flower (blossom/head). Stems and foliage
// naturally converge at the base, so including them causes over-rotation and spreading.
const FLOWER_REGION_HEIGHT_FRACTION = 0.30;
const BEZIER_SAMPLES = 12;
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

  const gMatch = svgContent.match(/<g[^>]*>([\s\S]*)<\/g>/i);
  let content = gMatch ? gMatch[0] : '';

  content = convertToStrokeOnly(content);

  const scaleFactor = BASE_FLOWER_HEIGHT / origHeight;
  const normalizedWidth = origWidth * scaleFactor;

  content = `<g transform="scale(${scaleFactor.toFixed(6)})">${content}</g>`;

  return {
    content,
    width: normalizedWidth,
    height: BASE_FLOWER_HEIGHT,
  };
}

export function loadFlowerSVG(
  month: string,
  position: 'left' | 'center' | 'right',
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

  const svgInfo = fileMapping[position];
  const fileName = svgInfo.path;
  const filePath = path.join(ASSETS_PATH, fileName);

  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const parsed = parseSVG(content);

    parsed.transformCenter = svgInfo.transformCenter;
    parsed.baseRotation = svgInfo.baseRotation;

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

interface Segment {
  p1: Point;
  p2: Point;
}

function parsePathD(d: string): Point[] {
  const points: Point[] = [];
  const tokens = d
    .replace(/([MLHVCSQTAZmlhvcsqtaz])/g, ' $1 ')
    .trim()
    .split(/[\s,]+/)
    .filter(Boolean);
  let i = 0;
  let x = 0;
  let y = 0;
  let startX = 0;
  let startY = 0;
  let lastCmd = '';

  function consumeNum(): number | null {
    if (i >= tokens.length) return null;
    const n = parseFloat(tokens[i]);
    if (isNaN(n)) return null;
    i++;
    return n;
  }

  function addPoint(px: number, py: number) {
    points.push({ x: px, y: py });
    x = px;
    y = py;
  }

  while (i < tokens.length) {
    const cmd = tokens[i];
    if (!cmd || cmd.length === 0) {
      i++;
      continue;
    }
    const c = cmd[0];
    if (/[MLCSQZHVcmcsqzhv]/.test(c)) {
      i++;
      lastCmd = c;
    } else {
      if (lastCmd === '') {
        i++;
        continue;
      }
    }

    switch (lastCmd.toLowerCase()) {
      case 'm': {
        const mx = consumeNum();
        const my = consumeNum();
        if (mx !== null && my !== null) {
          x = lastCmd === 'm' ? x + mx : mx;
          y = lastCmd === 'm' ? y + my : my;
          startX = x;
          startY = y;
          addPoint(x, y);
        }
        break;
      }
      case 'l': {
        const lx = consumeNum();
        const ly = consumeNum();
        if (lx !== null && ly !== null) {
          x = lastCmd === 'l' ? x + lx : lx;
          y = lastCmd === 'l' ? y + ly : ly;
          addPoint(x, y);
        }
        break;
      }
      case 'c': {
        const x1 = consumeNum();
        const y1 = consumeNum();
        const x2 = consumeNum();
        const y2 = consumeNum();
        const px = consumeNum();
        const py = consumeNum();
        if (
          x1 !== null &&
          y1 !== null &&
          x2 !== null &&
          y2 !== null &&
          px !== null &&
          py !== null
        ) {
          const p0x = x;
          const p0y = y;
          const p1x = lastCmd === 'c' ? x + x1 : x1;
          const p1y = lastCmd === 'c' ? y + y1 : y1;
          const p2x = lastCmd === 'c' ? x + x2 : x2;
          const p2y = lastCmd === 'c' ? y + y2 : y2;
          const p3x = lastCmd === 'c' ? x + px : px;
          const p3y = lastCmd === 'c' ? y + py : py;
          x = p3x;
          y = p3y;
          for (let t = 1; t <= BEZIER_SAMPLES; t++) {
            const u = t / BEZIER_SAMPLES;
            const v = 1 - u;
            const bx =
              v * v * v * p0x +
              3 * v * v * u * p1x +
              3 * v * u * u * p2x +
              u * u * u * p3x;
            const by =
              v * v * v * p0y +
              3 * v * v * u * p1y +
              3 * v * u * u * p2y +
              u * u * u * p3y;
            addPoint(bx, by);
          }
        }
        break;
      }
      case 'q': {
        const x1 = consumeNum();
        const y1 = consumeNum();
        const px = consumeNum();
        const py = consumeNum();
        if (x1 !== null && y1 !== null && px !== null && py !== null) {
          const p0x = x;
          const p0y = y;
          const p1x = lastCmd === 'q' ? x + x1 : x1;
          const p1y = lastCmd === 'q' ? y + y1 : y1;
          const p2x = lastCmd === 'q' ? x + px : px;
          const p2y = lastCmd === 'q' ? y + py : py;
          x = p2x;
          y = p2y;
          for (let t = 1; t <= BEZIER_SAMPLES; t++) {
            const u = t / BEZIER_SAMPLES;
            const v = 1 - u;
            const bx = v * v * p0x + 2 * v * u * p1x + u * u * p2x;
            const by = v * v * p0y + 2 * v * u * p1y + u * u * p2y;
            addPoint(bx, by);
          }
        }
        break;
      }
      case 'z':
        if (points.length > 0) {
          addPoint(startX, startY);
          x = startX;
          y = startY;
        }
        break;
      default:
        break;
    }
  }
  return points;
}

function extractPathSegments(
  flower: FlowerSVG,
  flowerRegion?: FlowerRegion | null,
): Segment[] {
  const scaleMatch = flower.content.match(/scale\(([\d.]+)\)/);
  const scale = scaleMatch ? parseFloat(scaleMatch[1]) : 1;
  const pathMatches = Array.from(
    flower.content.matchAll(/d=["']([^"']*)["']/gi),
  );
  const allSegments: Segment[] = [];
  const flowerHeight = flower.height;
  const yCutoff = flowerRegion
    ? flowerRegion.yMaxPct * flowerHeight
    : FLOWER_REGION_HEIGHT_FRACTION * flowerHeight;

  for (const match of pathMatches) {
    const d = match[1];
    if (!d?.trim()) continue;
    const points = parsePathD(d);
    for (let i = 1; i < points.length; i++) {
      const prev = points[i - 1];
      const p = points[i];
      const p1x = prev.x * scale;
      const p1y = prev.y * scale;
      const p2x = p.x * scale;
      const p2y = p.y * scale;
      if (p1y <= yCutoff && p2y <= yCutoff) {
        allSegments.push({
          p1: { x: p1x, y: p1y },
          p2: { x: p2x, y: p2y },
        });
      }
    }
  }
  return allSegments;
}

function segmentsIntersect(a: Segment, b: Segment): boolean {
  const dx1 = a.p2.x - a.p1.x;
  const dy1 = a.p2.y - a.p1.y;
  const dx2 = b.p2.x - b.p1.x;
  const dy2 = b.p2.y - b.p1.y;
  const denom = dx1 * dy2 - dy1 * dx2;
  const eps = 1e-9;
  if (Math.abs(denom) < eps) return false;
  const s = ((b.p1.x - a.p1.x) * dy2 - (b.p1.y - a.p1.y) * dx2) / denom;
  const t = ((b.p1.x - a.p1.x) * dy1 - (b.p1.y - a.p1.y) * dx1) / denom;
  return s >= 0 && s <= 1 && t >= 0 && t <= 1;
}

function transformSegments(
  segments: Segment[],
  slot: FlowerSlot,
  bindingPoint: Point,
): Segment[] {
  const { position, rotation } = slot;
  const angleRad = (rotation * Math.PI) / 180;
  const cos = Math.cos(angleRad);
  const sin = Math.sin(angleRad);
  const bx = bindingPoint.x;
  const by = bindingPoint.y;

  return segments.map((seg) => {
    const x1 = position.x + seg.p1.x;
    const y1 = position.y + seg.p1.y;
    const dx1 = x1 - bx;
    const dy1 = y1 - by;
    const x2 = position.x + seg.p2.x;
    const y2 = position.y + seg.p2.y;
    const dx2 = x2 - bx;
    const dy2 = y2 - by;
    return {
      p1: {
        x: bx + dx1 * cos - dy1 * sin,
        y: by + dx1 * sin + dy1 * cos,
      },
      p2: {
        x: bx + dx2 * cos - dy2 * sin,
        y: by + dx2 * sin + dy2 * cos,
      },
    };
  });
}

function segmentBBox(segments: Segment[]): {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
} | null {
  if (segments.length === 0) return null;
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const s of segments) {
    minX = Math.min(minX, s.p1.x, s.p2.x);
    minY = Math.min(minY, s.p1.y, s.p2.y);
    maxX = Math.max(maxX, s.p1.x, s.p2.x);
    maxY = Math.max(maxY, s.p1.y, s.p2.y);
  }
  return { minX, minY, maxX, maxY };
}

function bboxesOverlap(
  a: NonNullable<ReturnType<typeof segmentBBox>>,
  b: NonNullable<ReturnType<typeof segmentBBox>>,
): boolean {
  return (
    a.minX <= b.maxX && a.maxX >= b.minX && a.minY <= b.maxY && a.maxY >= b.minY
  );
}

function flowersCollide(segmentsA: Segment[], segmentsB: Segment[]): boolean {
  const bboxA = segmentBBox(segmentsA);
  const bboxB = segmentBBox(segmentsB);
  if (!bboxA || !bboxB || !bboxesOverlap(bboxA, bboxB)) return false;
  for (const sa of segmentsA) {
    for (const sb of segmentsB) {
      if (segmentsIntersect(sa, sb)) return true;
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
  const flowerCount = flowers.length;
  const centerIndex = Math.floor((flowerCount - 1) / 2);

  function getTransformedSegments(index: number): Segment[] {
    const flower = flowers[index];
    if (!flower) return [];
    const rawSegments = extractPathSegments(
      flower,
      flower.flowerRegion ?? null,
    );
    return transformSegments(
      rawSegments,
      {
        position: layout.slots[index].position,
        rotation: slots[index].rotation,
      },
      bindingPoint,
    );
  }

  for (let idx = 0; idx < flowerCount; idx++) {
    if (idx === centerIndex) continue;
    const isLeft = idx < centerIndex;
    // Check against ALL other flowers - adjacent same-side flowers (e.g. second-left
    // vs far-left, second-right vs far-right) were previously missed
    const refIndices = Array.from({ length: flowerCount }, (_, i) => i).filter(
      (i) => i !== idx,
    );

    let iter = 0;
    let clearedCollision = false;
    while (iter < MAX_COLLISION_ITERATIONS) {
      const mySegments = getTransformedSegments(idx);
      let collided = false;
      for (const refIdx of refIndices) {
        const refSegments = getTransformedSegments(refIdx);
        if (flowersCollide(mySegments, refSegments)) {
          collided = true;
          break;
        }
      }
      if (!collided) {
        clearedCollision = true;
        break;
      }
      console.log(
        'Collision detected, rotating flower',
        idx,
        'by',
        isLeft ? -COLLISION_ANGLE_STEP : COLLISION_ANGLE_STEP,
      );
      slots[idx].rotation += isLeft
        ? -COLLISION_ANGLE_STEP
        : COLLISION_ANGLE_STEP;
      iter++;
    }

    if (clearedCollision && COLLISION_ANGLE_BUFFER > 0) {
      const bufferAngle =
        (isLeft ? -1 : 1) * COLLISION_ANGLE_STEP * COLLISION_ANGLE_BUFFER;
      slots[idx].rotation += bufferAngle;
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
  const { rotation, position } = slot;

  return `
    <g id="flower-${index}" 
       transform="rotate(${rotation.toFixed(2)}, ${bindingPoint.x}, ${bindingPoint.y}) translate(${position.x.toFixed(2)}, ${position.y.toFixed(2)}) ">
      ${flower.content}
    </g>`;
}

export function composeBouquet(
  layout: LayoutTemplate,
  flowers: Array<FlowerSVG | null>,
  charmShape: CharmShape,
): string {
  const { viewBox, bindingPoint } = layout;
  const config = CHARM_SHAPE_CONFIG[charmShape] ?? CHARM_SHAPE_CONFIG.coin;

  const flowersContent = flowers
    .map((flower, index) =>
      flower
        ? transformFlower(flower, layout.slots[index], bindingPoint, index)
        : '',
    )
    .join('\n');

  const cx = viewBox.width / 2;
  const cy = viewBox.height / 2;
  const needsScale = config.scaleX !== 1 || config.scaleY !== 1;
  const scaleAttr = needsScale
    ? ` transform="translate(${cx}, ${cy}) scale(${config.scaleX}, ${config.scaleY}) translate(${-cx}, ${-cy})"`
    : '';

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" version="1.1"
     viewBox="0 0 ${viewBox.width} ${viewBox.height}"
     width="${viewBox.width}px" height="${viewBox.height}px">
  <g id="bouquet"${scaleAttr}>
    <g id="flowers">
    ${flowersContent}
    </g>
  </g>
</svg>`;
}
