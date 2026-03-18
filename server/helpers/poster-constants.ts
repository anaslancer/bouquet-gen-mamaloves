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

/** Bouquet SVG height as fraction of page height */
export const BOUQUET_HEIGHT_FRACTION = 0.45;

/** Bouquet SVG target size in pt (square; height = 40% of page) */
export const BOUQUET_HEIGHT_PT = A4_HEIGHT_PT * BOUQUET_HEIGHT_FRACTION;
export const BOUQUET_WIDTH_PT = BOUQUET_HEIGHT_PT;

/** Typography — General Sans Bold (heading), IvyPresto Display (names) */
export const TITLE_FONT_SIZE = 23;
export const TITLE_LINE_HEIGHT = 1.4;
/** Letter spacing for title (pt) to match reference design */
export const TITLE_CHARACTER_SPACING = 10;
export const NAMES_FONT_SIZE = 20;
export const NAMES_LINE_HEIGHT = 1.4;
/** Letter spacing for names (pt) */
export const NAMES_CHARACTER_SPACING = 5;

/** Spacing between sections in pt */
export const SECTION_SPACING_PT = 24;

/** Page background color */
export const PDF_BACKGROUND_COLOR = '#fffaf5';

/** Font paths - General Sans Bold (title), IvyPresto Display (names).
 *  Place font files in assets/fonts/. Falls back to Helvetica if missing. */
export const FONT_TITLE = path.join(
  __dirname,
  '../../assets/fonts/GeneralSans-Bold.ttf',
);
export const FONT_NAMES = path.join(
  __dirname,
  '../../assets/fonts/PlayfairDisplay-Regular.ttf',
);

/** MamaLoves logo — 20mm from right and bottom of page. Place file in assets/logo/. */
export const LOGO_PATH = path.join(
  __dirname,
  '../../assets/logo/MAMALOVES_Logo_Liggend.png',
);
export const LOGO_OFFSET_MM = 20; // mm from right and bottom edges
