/**
 * SVG loading and composition utilities
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import type { FlowerSVG, FlowerSlot, LayoutTemplate, Point } from './types';
import {
  FLOWER_FILES,
  MONTH_TO_FLOWER,
  SVG_CONFIG,
  BASE_FLOWER_HEIGHT,
  STEM_BASE_OVERRIDES,
} from './constants';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ASSETS_PATH = path.join(__dirname, '../../assets/flowers');

/**
 * Convert filled SVG paths to stroke-only for laser engraving
 * Removes fill attributes and adds stroke attributes
 */
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

/**
 * Parse SVG file content and extract dimensions
 */
function parseSVG(svgContent: string): FlowerSVG {
  let width = 100,
    height = 100;

  const widthMatch = svgContent.match(/width="([\d.]+)(px)?"/i);
  const heightMatch = svgContent.match(/height="([\d.]+)(px)?"/i);

  if (widthMatch && heightMatch) {
    width = parseFloat(widthMatch[1]);
    height = parseFloat(heightMatch[1]);
  } else {
    const viewBoxMatch = svgContent.match(/viewBox="([^"]+)"/i);
    if (viewBoxMatch) {
      const parts = viewBoxMatch[1].trim().split(/\s+/);
      if (parts.length === 4) {
        width = parseFloat(parts[2]);
        height = parseFloat(parts[3]);
      }
    }
  }
  // svgContent = removeBackgroundPath(svgContent);

  const gMatch = svgContent.match(/<g[^>]*>([\s\S]*)<\/g>/i);
  let content = gMatch ? gMatch[0] : '';

  content = convertToStrokeOnly(content);

  // Default stem base: bottom center of the SVG
  const stemBase = { x: width / 2, y: height };

  return { content, width, height, stemBase };
}

/**
 * Load a flower SVG for given month and position
 */
export function loadFlowerSVG(
  month: string,
  position: 'left' | 'center' | 'right',
): FlowerSVG | null {
  // console.log(month, position);
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
  const fileName = typeof svgInfo === 'string' ? svgInfo : svgInfo.path;
  const filePath = path.join(ASSETS_PATH, fileName);

  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const parsed = parseSVG(content);

    // Apply stem base override if this flower has an off-center stem
    const override = STEM_BASE_OVERRIDES[fileName];
    if (override) {
      parsed.stemBase = {
        x: parsed.width * override.x,
        y: parsed.height * override.y,
      };
    }

    if (typeof svgInfo === 'object' && svgInfo.angle !== undefined) {
      parsed.rotation = svgInfo.angle;
    }
    return parsed;
  } catch (error) {
    console.error(`Failed to load: ${filePath}`);
    return null;
  }
}

/**
 * Check if flower assets exist
 */
export function checkAssetsExist(): boolean {
  try {
    const files = fs.readdirSync(ASSETS_PATH);
    return files.length > 0;
  } catch {
    return false;
  }
}

/**
 * Transform flower using stem-base rotation approach.
 *
 * Each flower is placed so its stem base sits at the binding point,
 * then rotated around that point to create the bouquet fan effect.
 *
 * Transform chain (applied right-to-left in SVG):
 * 1. translate(-stemBase.x, -stemBase.y)  — move stem base to origin
 * 2. scale(s)                             — scale to target height
 * 3. rotate(angle)                        — fan out from binding point
 * 4. translate(bindingPoint.x, y)         — place at binding point
 *
 * Result: stem base lands exactly at the binding point, flower fans upward.
 */
function transformFlower(
  flower: FlowerSVG,
  slot: FlowerSlot,
  bindingPoint: Point,
  index: number,
): string {
  // const { tilt } = slot;
  const tilt = 0;
  const scale = BASE_FLOWER_HEIGHT / flower.height;
  // const { x: sbx, y: sby } = flower.stemBase;
  const sby = 600;
  const sbx = -200 + 400 * index;

  return `
    <g id="flower-${index}" 
       transform="translate(${bindingPoint.x.toFixed(2)}, ${bindingPoint.y.toFixed(2)}) rotate(${tilt.toFixed(2)}) scale(${scale.toFixed(4)}) translate(${(-sbx).toFixed(2)}, ${(-sby).toFixed(2)})">
      ${flower.content}
    </g>`;
}

/**
 * Compose complete bouquet SVG
 */
export function composeBouquet(
  layout: LayoutTemplate,
  flowers: Array<FlowerSVG | null>,
): string {
  const { viewBox, bindingPoint } = layout;

  const flowersContent = flowers
    .map((flower, index) =>
      flower
        ? transformFlower(flower, layout.slots[index], bindingPoint, index)
        : '',
    )
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" version="1.1"
     viewBox="0 0 ${viewBox.width} ${viewBox.height}"
     width="${viewBox.width}px" height="${viewBox.height}px">
  <!-- Generated Bouquet -->
  <g id="flowers">
    ${flowersContent}
  </g>
</svg>`;
}
