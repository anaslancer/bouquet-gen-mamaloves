import * as fs from 'fs';
import * as path from 'path';
import { getProjectRoot } from './path-utils';
import type { GenerateBouquetRequest, CharmShape } from '@shared/schema';
import { POSTER_TITLE_PROP, POSTER_NAMES_PROP } from './constants';
import { generateLayout, getFlowerPosition } from './layout';
import {
  loadFlowerSVG,
  composeBouquet,
  checkAssetsExist,
  getFlowersAssetsPath,
  resolveCollisions,
  balanceFlowerAngles,
} from './svg-utils';

const OUTPUT_DIR = path.join(getProjectRoot(), 'generated_svg');

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
    throw new Error(`Flower assets not found at ${getFlowersAssetsPath()}`);
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

  const balancedLayout = balanceFlowerAngles(resolvedLayout, flowerSVGs);

  // Re-run collision resolution after balancing (balancing can re-introduce overlaps)
  const finalLayout = resolveCollisions(
    balancedLayout,
    flowerSVGs,
    balancedLayout.bindingPoint,
  );

  const svg = composeBouquet(
    finalLayout,
    flowerSVGs,
    charmShape as CharmShape,
  );

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

export function extractTextFromLineItem(lineItem: {
  properties?: Array<{ name: string; value: string }>;
}): { title?: string; names?: string } {
  const result: { title?: string; names?: string } = {};

  function getProp(
    props: Array<{ name: string; value: string }> | undefined,
    name: string,
  ): string | undefined {
    if (!props) return undefined;
    const p = props.find((x) => x.name === name);
    return p?.value?.trim() || undefined;
  }

  if (lineItem.properties?.length) {
    result.title = getProp(lineItem.properties, POSTER_TITLE_PROP);
    result.names = getProp(lineItem.properties, POSTER_NAMES_PROP);
  }

  return result;
}

export function extractTextFromOrder(orderData: {
  note_attributes?: Array<{ name: string; value: string }>;
  line_items?: Array<{ properties?: Array<{ name: string; value: string }> }>;
}): { title?: string; names?: string } {
  const result: { title?: string; names?: string } = {};

  function getProp(
    props: Array<{ name: string; value: string }> | undefined,
    name: string,
  ): string | undefined {
    if (!props) return undefined;
    const p = props.find((x) => x.name === name);
    return p?.value?.trim() || undefined;
  }

  if (orderData.note_attributes?.length) {
    result.title = getProp(orderData.note_attributes, POSTER_TITLE_PROP);
    result.names = getProp(orderData.note_attributes, POSTER_NAMES_PROP);
  }

  if (result.title === undefined && result.names === undefined) {
    const firstItem = orderData.line_items?.[0];
    if (firstItem?.properties?.length) {
      result.title = getProp(firstItem.properties, POSTER_TITLE_PROP);
      result.names = getProp(firstItem.properties, POSTER_NAMES_PROP);
    }
  }

  return result;
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
