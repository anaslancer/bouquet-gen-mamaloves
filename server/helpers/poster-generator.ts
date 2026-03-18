import * as fs from 'fs';
import * as path from 'path';
import { getProjectRoot } from './path-utils';
import PDFDocument from 'pdfkit';
import SVGtoPDF from 'svg-to-pdfkit';
import {
  A4_WIDTH_PT,
  A4_HEIGHT_PT,
  MARGIN_PT,
  CONTENT_WIDTH_PT,
  CONTENT_HEIGHT_PT,
  BOUQUET_WIDTH_PT,
  BOUQUET_HEIGHT_PT,
  TITLE_FONT_SIZE,
  TITLE_LINE_HEIGHT,
  TITLE_CHARACTER_SPACING,
  NAMES_FONT_SIZE,
  NAMES_LINE_HEIGHT,
  NAMES_CHARACTER_SPACING,
  SECTION_SPACING_PT,
  PDF_BACKGROUND_COLOR,
  FONT_TITLE,
  FONT_NAMES,
  LOGO_PATH,
  LOGO_OFFSET_MM,
} from './poster-constants';

const OUTPUT_DIR = path.join(getProjectRoot(), 'generated_pdf');

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

/** Convert mm to PDF points (72 pt = 1 inch, 25.4 mm = 1 inch) */
function mmToPt(mm: number): number {
  return (mm / 25.4) * 72;
}

function drawLogo(
  doc: InstanceType<typeof PDFDocument>,
  logoPath: string,
): void {
  if (!fs.existsSync(logoPath)) return;
  try {
    const img = doc.openImage(logoPath);
    const offsetPt = mmToPt(LOGO_OFFSET_MM);
    const logoWidth = 80; // pt — adjust if needed
    const logoHeight = (img.height / img.width) * logoWidth;
    const x = A4_WIDTH_PT - offsetPt - logoWidth;
    const y = A4_HEIGHT_PT - offsetPt - logoHeight;
    doc.image(img, x, y, { width: logoWidth });
  } catch {
    // Logo missing or invalid — skip silently
  }
}

function generateFilename(
  flowers?: string[],
  orderId?: string,
  lineItemId?: string,
  combined?: boolean,
): string {
  const timestamp = Date.now();
  if (combined && orderId) {
    return `poster_${orderId}_combined_${timestamp}.pdf`;
  }
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

    doc.rect(0, 0, A4_WIDTH_PT, A4_HEIGHT_PT).fill(PDF_BACKGROUND_COLOR);

    let y = A4_HEIGHT_PT * 0.18;

    const bouquetHeightPt = BOUQUET_HEIGHT_PT;
    const bouquetX = (A4_WIDTH_PT - BOUQUET_WIDTH_PT) / 2;
    const bouquetY = y;

    try {
      SVGtoPDF(doc, svg, bouquetX, bouquetY, {
        width: BOUQUET_WIDTH_PT,
        height: bouquetHeightPt,
        preserveAspectRatio: 'xMidYMid meet',
        assumePt: true,
      });
    } catch (err) {
      reject(err);
      return;
    }

    y = A4_HEIGHT_PT * 0.67;

    if (title && title.trim()) {
      doc
        .font(useTitleFont ? 'PosterTitle' : 'Helvetica')
        .fontSize(TITLE_FONT_SIZE)
        .fillColor('#000000');

      const titleHeight = getTextHeight(doc, title, CONTENT_WIDTH_PT);
      doc.text(title, MARGIN_PT, y, {
        width: CONTENT_WIDTH_PT,
        align: 'center',
        lineGap: TITLE_FONT_SIZE * (TITLE_LINE_HEIGHT - 1),
        characterSpacing: TITLE_CHARACTER_SPACING,
      });
      y += titleHeight + SECTION_SPACING_PT;
    }

    if (names && names.trim()) {
      doc
        .font(useNamesFont ? 'PosterNames' : 'Helvetica')
        .fontSize(NAMES_FONT_SIZE)
        .fillColor('#000000');

      doc.text(names, MARGIN_PT, y, {
        width: CONTENT_WIDTH_PT,
        align: 'center',
        lineGap: NAMES_FONT_SIZE * (NAMES_LINE_HEIGHT - 1),
        characterSpacing: NAMES_CHARACTER_SPACING,
      });
    }

    drawLogo(doc, LOGO_PATH);

    doc.end();
  });
}

export interface MultiPagePosterPage {
  svg: string;
  title?: string;
  names?: string;
}

function drawPosterPageContent(
  doc: InstanceType<typeof PDFDocument>,
  page: MultiPagePosterPage,
  useTitleFont: boolean,
  useNamesFont: boolean,
): void {
  doc.rect(0, 0, A4_WIDTH_PT, A4_HEIGHT_PT).fill(PDF_BACKGROUND_COLOR);

  const { svg, title, names } = page;
  let y = MARGIN_PT;

  const bouquetHeightPt = BOUQUET_HEIGHT_PT;
  const bouquetX = (A4_WIDTH_PT - BOUQUET_WIDTH_PT) / 2;
  const bouquetY = y;

  SVGtoPDF(doc, svg, bouquetX, bouquetY, {
    width: BOUQUET_WIDTH_PT,
    height: bouquetHeightPt,
    preserveAspectRatio: 'xMidYMid meet',
    assumePt: true,
  });

  y += bouquetHeightPt + SECTION_SPACING_PT;

  if (title && title.trim()) {
    doc
      .font(useTitleFont ? 'PosterTitle' : 'Helvetica')
      .fontSize(TITLE_FONT_SIZE)
      .fillColor('#000000');

    const titleHeight = getTextHeight(doc, title, CONTENT_WIDTH_PT);
    doc.text(title, MARGIN_PT, y, {
      width: CONTENT_WIDTH_PT,
      align: 'center',
      lineGap: TITLE_FONT_SIZE * (TITLE_LINE_HEIGHT - 1),
      characterSpacing: TITLE_CHARACTER_SPACING,
    });
    y += titleHeight + SECTION_SPACING_PT;
  }

  if (names && names.trim()) {
    doc
      .font(useNamesFont ? 'PosterNames' : 'Helvetica')
      .fontSize(NAMES_FONT_SIZE)
      .fillColor('#000000');

    doc.text(names, MARGIN_PT, y, {
      width: CONTENT_WIDTH_PT,
      align: 'center',
      lineGap: NAMES_FONT_SIZE * (NAMES_LINE_HEIGHT - 1),
      characterSpacing: NAMES_CHARACTER_SPACING,
    });
  }

  drawLogo(doc, LOGO_PATH);
}

export async function generateMultiPagePoster(
  pages: MultiPagePosterPage[],
  options?: {
    orderId?: string;
  },
): Promise<GeneratePosterResult> {
  if (pages.length === 0) {
    throw new Error('At least one page is required');
  }

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
        undefined,
        options?.orderId,
        undefined,
        true,
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

    for (let i = 0; i < pages.length; i++) {
      if (i > 0) {
        doc.addPage();
      }
      try {
        drawPosterPageContent(doc, pages[i], useTitleFont, useNamesFont);
      } catch (err) {
        reject(err);
        return;
      }
    }

    doc.end();
  });
}
