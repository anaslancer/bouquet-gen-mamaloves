import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import type { GenerateBouquetRequest, CharmShape } from '@shared/schema';
import { generateLayout, getFlowerPosition } from './layout';
import {
  loadFlowerSVG,
  composeBouquet,
  checkAssetsExist,
  resolveCollisions,
} from './svg-utils';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const OUTPUT_DIR = path.join(__dirname, '../../generated_svg');

function ensureOutputDir(): void {
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }
}

function generateFilename(flowers: string[]): string {
  const timestamp = Date.now();
  const flowerList = flowers.join('_').toLowerCase().replace(/\s/g, '');
  return `bouquet_${flowerList}_${timestamp}.svg`;
}

export async function generateBouquet(
  request: GenerateBouquetRequest,
): Promise<{ filename: string; path: string; svg: string }> {
  const { flowers, charmShape } = request;

  if (flowers.length < 1 || flowers.length > 5) {
    throw new Error(`Invalid flower count: ${flowers.length}. Must be 1-5.`);
  }

  if (!checkAssetsExist()) {
    throw new Error('Flower assets not found');
  }

  const positions = flowers.map((_, index) =>
    getFlowerPosition(index, flowers.length),
  );
  const flowerSVGs = flowers.map((month, index) =>
    loadFlowerSVG(month, positions[index]),
  );

  const loadedCount = flowerSVGs.filter((f) => f !== null).length;
  if (loadedCount === 0) {
    throw new Error('Failed to load any flower SVGs');
  }

  const layout = generateLayout(flowerSVGs, charmShape as CharmShape);
  const resolvedLayout = resolveCollisions(
    layout,
    flowerSVGs,
    layout.bindingPoint,
  );
  const svg = composeBouquet(resolvedLayout, flowerSVGs, charmShape as CharmShape);

  ensureOutputDir();
  const filename = generateFilename(flowers);
  const filepath = path.join(OUTPUT_DIR, filename);

  return { filename, path: filepath, svg };
}

export function extractFlowersFromLineItem(lineItem: any): string[] | null {
  if (!lineItem.properties || !Array.isArray(lineItem.properties)) {
    return null;
  }

  const flowers: string[] = [];

  for (const prop of lineItem.properties) {
    const match = prop.name?.match(/Voorkant geboortebloem (\d)/);
    if (match && prop.value) {
      const index = parseInt(match[1]) - 1;
      flowers[index] = prop.value;
    }
  }

  return flowers.filter(Boolean).length > 0 ? flowers.filter(Boolean) : null;
}

export function parseCharmTypeFromSKU(sku: string): CharmShape {
  if (!sku) return 'coin';
  const parts = sku.split('-');
  if (parts.length < 2) return 'coin';

  const code = parts[1];
  switch (code) {
    case 'CO':
      return 'coin';
    case 'OV':
      return 'oval';
    case 'HT':
      return 'heart';
    case 'RN':
      return 'round';
    default:
      return 'coin';
  }
}
