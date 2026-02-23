import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/** A4 dimensions in PDF points (72 pt = 1 inch, 25.4 mm = 1 inch) */
export const A4_WIDTH_PT = 595.28;
export const A4_HEIGHT_PT = 841.89;

/** Margins in pt (~20mm) */
export const MARGIN_PT = 56.69;

/** Usable area */
export const CONTENT_WIDTH_PT = A4_WIDTH_PT - 2 * MARGIN_PT;
export const CONTENT_HEIGHT_PT = A4_HEIGHT_PT - 2 * MARGIN_PT;

/** Bouquet SVG target width in pt (~140mm) */
export const BOUQUET_WIDTH_PT = 396.85;

/** Typography */
export const TITLE_FONT_SIZE = 24;
export const TITLE_LINE_HEIGHT = 1.4;
export const NAMES_FONT_SIZE = 18;
export const NAMES_LINE_HEIGHT = 1.4;

/** Spacing between sections in pt */
export const SECTION_SPACING_PT = 24;

/** Font paths - from @fontsource packages (WOFF supported by PDFKit) */
export const FONT_TITLE = path.join(
  __dirname,
  '../../node_modules/@fontsource/crimson-text/files/crimson-text-latin-400-normal.woff',
);
export const FONT_NAMES = path.join(
  __dirname,
  '../../node_modules/@fontsource/source-sans-3/files/source-sans-3-latin-400-normal.woff',
);
