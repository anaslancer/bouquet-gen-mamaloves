import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import PDFDocument from 'pdfkit';
import SVGtoPDF from 'svg-to-pdfkit';
import {
  A4_WIDTH_PT,
  A4_HEIGHT_PT,
  MARGIN_PT,
  CONTENT_WIDTH_PT,
  CONTENT_HEIGHT_PT,
  BOUQUET_WIDTH_PT,
  TITLE_FONT_SIZE,
  TITLE_LINE_HEIGHT,
  NAMES_FONT_SIZE,
  NAMES_LINE_HEIGHT,
  SECTION_SPACING_PT,
  FONT_TITLE,
  FONT_NAMES,
} from './poster-constants';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const OUTPUT_DIR = path.join(__dirname, '../../generated_pdf');

export interface GeneratePosterInput {
  svg: string;
  title?: string;
  names?: string;
}

export interface GeneratePosterResult {
  filename: string;
  path: string;
  buffer: Buffer;
}

function ensureOutputDir(): void {
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }
}

function fontExists(fontPath: string): boolean {
  try {
    return fs.existsSync(fontPath);
  } catch {
    return false;
  }
}

function generateFilename(flowers?: string[], orderId?: string, lineItemId?: string): string {
  const timestamp = Date.now();
  if (orderId && lineItemId) {
    return `poster_${orderId}_${lineItemId}_${timestamp}.pdf`;
  }
  if (flowers && flowers.length > 0) {
    const flowerList = flowers.join('_').toLowerCase().replace(/\s/g, '');
    return `poster_${flowerList}_${timestamp}.pdf`;
  }
  return `poster_${timestamp}.pdf`;
}

/**
 * Measure text height for wrapped text.
 */
function getTextHeight(
  doc: InstanceType<typeof PDFDocument>,
  text: string,
  maxWidth: number,
): number {
  return doc.heightOfString(text, { width: maxWidth });
}

export async function generatePoster(
  input: GeneratePosterInput,
  options?: {
    flowers?: string[];
    orderId?: string;
    lineItemId?: string;
  },
): Promise<GeneratePosterResult> {
  const { svg, title, names } = input;

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: 'A4',
      margin: 0,
      autoFirstPage: true,
    });

    const chunks: Buffer[] = [];
    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', () => {
      const buffer = Buffer.concat(chunks);
      ensureOutputDir();
      const filename = generateFilename(
        options?.flowers,
        options?.orderId,
        options?.lineItemId,
      );
      const filepath = path.join(OUTPUT_DIR, filename);
      fs.writeFileSync(filepath, buffer);
      resolve({ filename, path: filepath, buffer });
    });
    doc.on('error', reject);

    const useTitleFont = fontExists(FONT_TITLE);
    const useNamesFont = fontExists(FONT_NAMES);

    if (useTitleFont) {
      doc.registerFont('PosterTitle', FONT_TITLE);
    }
    if (useNamesFont) {
      doc.registerFont('PosterNames', FONT_NAMES);
    }

    let y = MARGIN_PT;

    if (title && title.trim()) {
      doc.font(useTitleFont ? 'PosterTitle' : 'Helvetica')
        .fontSize(TITLE_FONT_SIZE)
        .fillColor('#000000');

      const titleHeight = getTextHeight(doc, title, CONTENT_WIDTH_PT);
      doc.text(title, MARGIN_PT, y, {
        width: CONTENT_WIDTH_PT,
        align: 'center',
        lineGap: TITLE_FONT_SIZE * (TITLE_LINE_HEIGHT - 1),
      });
      y += titleHeight + SECTION_SPACING_PT;
    }

    const bouquetHeightPt = BOUQUET_WIDTH_PT;
    const bouquetX = (A4_WIDTH_PT - BOUQUET_WIDTH_PT) / 2;
    const bouquetY = y;

    try {
      SVGtoPDF(doc, svg, bouquetX, bouquetY, {
        width: BOUQUET_WIDTH_PT,
        height: bouquetHeightPt,
        preserveAspectRatio: 'xMidYMid meet',
      });
    } catch (err) {
      reject(err);
      return;
    }

    y += bouquetHeightPt + SECTION_SPACING_PT;

    if (names && names.trim()) {
      doc.font(useNamesFont ? 'PosterNames' : 'Helvetica')
        .fontSize(NAMES_FONT_SIZE)
        .fillColor('#000000');

      doc.text(names, MARGIN_PT, y, {
        width: CONTENT_WIDTH_PT,
        align: 'center',
        lineGap: NAMES_FONT_SIZE * (NAMES_LINE_HEIGHT - 1),
      });
    }

    doc.end();
  });
}
