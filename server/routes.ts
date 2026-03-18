import type { Express, Request, Response } from 'express';
import { createServer, type Server } from 'http';
import { generateBouquetSchema, generatePosterSchema } from '@shared/schema';
import {
  generateBouquet,
  extractFlowersFromLineItem,
  extractTextFromOrder,
  extractTextFromLineItem,
  parseCharmTypeFromSKU,
} from './helpers/bouquet-generator';
import {
  generatePoster,
  generateMultiPagePoster,
} from './helpers/poster-generator';
import { checkAssetsExist } from './helpers/svg-utils';
import { FLOWER_FILES } from './helpers/constants';

/** Resolve position config: if it has base, merge base config with overrides */
function resolveFlowerPosition(
  positions: Record<
    string,
    {
      path?: string;
      base?: string;
      transformCenter?: { x: number; y: number };
      baseRotation?: number;
      flowerPoly?: { x: number; y: number }[];
    }
  >,
  position: string,
) {
  const posConfig = positions[position];
  const resolved = posConfig?.base
    ? { ...positions[posConfig.base], ...posConfig }
    : { ...(posConfig ?? {}) };
  return resolved.path
    ? {
        path: resolved.path,
        transformCenter: resolved.transformCenter ?? { x: 0.5, y: 0.8 },
        baseRotation: resolved.baseRotation ?? 0,
        flowerPoly: resolved.flowerPoly ?? [],
      }
    : null;
}

export async function registerRoutes(
  httpServer: Server,
  app: Express,
): Promise<Server> {
  app.post('/api/bouquet', async (req: Request, res: Response) => {
    try {
      const parseResult = generateBouquetSchema.safeParse(req.body);

      if (!parseResult.success) {
        return res.status(400).json({
          ok: false,
          error: 'Invalid request',
          details: parseResult.error.errors,
        });
      }

      const result = await generateBouquet(parseResult.data);

      return res.json({
        ok: true,
        filename: result.filename,
        path: result.path,
        svg: result.svg,
      });
    } catch (error) {
      console.error('Bouquet generation error:', error);
      return res.status(500).json({
        ok: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  app.post('/api/bouquet/from-order', async (req: Request, res: Response) => {
    try {
      const orderData = req.body.order || req.body;

      if (!orderData.line_items || !Array.isArray(orderData.line_items)) {
        return res.status(400).json({
          ok: false,
          error: 'No line_items found',
        });
      }

      const results = [];

      for (const lineItem of orderData.line_items) {
        if (!lineItem.sku?.startsWith('BFB')) continue;

        const flowers = extractFlowersFromLineItem(lineItem);
        if (!flowers || flowers.length === 0) continue;

        const charmShape = parseCharmTypeFromSKU(lineItem.sku);

        const result = await generateBouquet({ flowers, charmShape });
        results.push({
          lineItemId: lineItem.id,
          ...result,
        });
      }

      if (results.length === 0) {
        return res.status(400).json({
          ok: false,
          error: 'No valid birthflower products found',
        });
      }

      return res.json({
        ok: true,
        orderId: orderData.id,
        bouquets: results,
      });
    } catch (error) {
      console.error('Order processing error:', error);
      return res.status(500).json({
        ok: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  app.get('/api/flowers', (_req: Request, res: Response) => {
    const positionKeys = Object.keys(
      Object.values(FLOWER_FILES)[0] ?? {},
    ) as string[];
    const flowers: Record<
      string,
      Record<
        string,
        {
          path: string;
          transformCenter: { x: number; y: number };
          baseRotation: number;
          flowerPoly: { x: number; y: number }[];
        }
      >
    > = {};
    const pathsSet = new Set<string>();

    for (const [month, positions] of Object.entries(FLOWER_FILES)) {
      flowers[month] = {};
      for (const pos of positionKeys) {
        const resolved = resolveFlowerPosition(positions, pos);
        if (resolved) {
          flowers[month][pos] = resolved;
          pathsSet.add(resolved.path);
        }
      }
    }

    return res.json({
      flowers,
      paths: Array.from(pathsSet).sort(),
      months: Object.keys(FLOWER_FILES),
      positions: positionKeys,
    });
  });

  app.get('/api/bouquet/status', (_req: Request, res: Response) => {
    return res.json({
      ok: true,
      assetsAvailable: checkAssetsExist(),
      supportedFlowerCounts: [1, 2, 3, 4, 5],
      supportedCharmShapes: ['coin', 'oval', 'heart', 'round', 'poster'],
    });
  });

  app.post('/api/poster', async (req: Request, res: Response) => {
    try {
      const parseResult = generatePosterSchema.safeParse(req.body);

      if (!parseResult.success) {
        return res.status(400).json({
          ok: false,
          error: 'Invalid request',
          details: parseResult.error.errors,
        });
      }

      const { flowers, title, names } = parseResult.data;
      const bouquetResult = await generateBouquet({
        flowers,
        charmShape: 'poster',
      });
      const posterResult = await generatePoster(
        { svg: bouquetResult.svg, title, names },
        { flowers },
      );

      return res.json({
        ok: true,
        filename: posterResult.filename,
        path: posterResult.path,
        pdf: posterResult.buffer.toString('base64'),
      });
    } catch (error) {
      console.error('Poster generation error:', error);
      return res.status(500).json({
        ok: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  app.post('/api/poster/from-order', async (req: Request, res: Response) => {
    try {
      const orderData = req.body.order || req.body;

      if (!orderData.line_items || !Array.isArray(orderData.line_items)) {
        return res.status(400).json({
          ok: false,
          error: 'No line_items found',
        });
      }

      const { title, names } = extractTextFromOrder(orderData);
      const results = [];

      for (const lineItem of orderData.line_items) {
        if (!lineItem.sku?.startsWith('BFB')) continue;

        const flowers = extractFlowersFromLineItem(lineItem);
        if (!flowers || flowers.length === 0) continue;

        const charmShape = parseCharmTypeFromSKU(lineItem.sku);
        const bouquetResult = await generateBouquet({
          flowers,
          charmShape: 'poster',
        });

        const posterResult = await generatePoster(
          { svg: bouquetResult.svg, title, names },
          {
            orderId: String(orderData.id),
            lineItemId: String(lineItem.id),
            flowers,
          },
        );

        results.push({
          lineItemId: lineItem.id,
          filename: posterResult.filename,
          path: posterResult.path,
          pdf: posterResult.buffer.toString('base64'),
        });
      }

      if (results.length === 0) {
        return res.status(400).json({
          ok: false,
          error: 'No valid birthflower products found',
        });
      }

      return res.json({
        ok: true,
        orderId: orderData.id,
        posters: results,
      });
    } catch (error) {
      console.error('Poster from-order error:', error);
      return res.status(500).json({
        ok: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  app.post(
    '/api/poster/from-order/combined',
    async (req: Request, res: Response) => {
      try {
        const orderData = req.body.order || req.body;

        if (!orderData.line_items || !Array.isArray(orderData.line_items)) {
          return res.status(400).json({
            ok: false,
            error: 'No line_items found',
          });
        }

        const orderTitleNames = extractTextFromOrder(orderData);
        const pages: Array<{ svg: string; title?: string; names?: string }> =
          [];

        for (const lineItem of orderData.line_items) {
          if (!lineItem.sku?.startsWith('BFB')) continue;

          const flowers = extractFlowersFromLineItem(lineItem);
          if (!flowers || flowers.length === 0) continue;

          const lineItemTitleNames = extractTextFromLineItem(lineItem);
          const title = lineItemTitleNames.title ?? orderTitleNames.title;
          const names = lineItemTitleNames.names ?? orderTitleNames.names;

          const charmShape = parseCharmTypeFromSKU(lineItem.sku);
          const bouquetResult = await generateBouquet({ flowers, charmShape });
          pages.push({
            svg: bouquetResult.svg,
            title,
            names,
          });
        }

        if (pages.length === 0) {
          return res.status(400).json({
            ok: false,
            error: 'No valid birthflower products found',
          });
        }

        const posterResult = await generateMultiPagePoster(pages, {
          orderId: String(orderData.id),
        });

        return res.json({
          ok: true,
          orderId: orderData.id,
          filename: posterResult.filename,
          path: posterResult.path,
          pdf: posterResult.buffer.toString('base64'),
        });
      } catch (error) {
        console.error('Poster from-order/combined error:', error);
        return res.status(500).json({
          ok: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    },
  );

  return httpServer;
}
