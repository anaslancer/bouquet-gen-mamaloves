/**
 * API Routes for Bouquet Generator
 */

import type { Express, Request, Response } from 'express';
import { createServer, type Server } from 'http';
import { generateBouquetSchema } from '@shared/schema';
import {
  generateBouquet,
  extractFlowersFromLineItem,
  parseCharmTypeFromSKU,
} from './helpers/bouquet-generator';
import { checkAssetsExist } from './helpers/svg-utils';

export async function registerRoutes(
  httpServer: Server,
  app: Express,
): Promise<Server> {
  /**
   * POST /api/bouquet
   *
   * Generate a bouquet SVG from flower selections
   * Saves result to ./generated_svg directory
   *
   * Request body:
   * {
   *   "flowers": ["Februari", "April", "Augustus", "December"],
   *   "charmShape": "coin"  // optional
   * }
   *
   * Response: { "ok": true, "filename": "bouquet_xxx.svg" }
   */
  app.post('/api/bouquet', async (req: Request, res: Response) => {
    try {
      // Validate request
      const parseResult = generateBouquetSchema.safeParse(req.body);

      if (!parseResult.success) {
        return res.status(400).json({
          ok: false,
          error: 'Invalid request',
          details: parseResult.error.errors,
        });
      }

      // Generate bouquet and save to file
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

  /**
   * POST /api/bouquet/from-order
   *
   * Generate bouquets from Shopify order data
   */
  app.post('/api/bouquet/from-order', async (req: Request, res: Response) => {
    try {
      // Handle both wrapped and unwrapped formats
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

  /**
   * GET /api/bouquet/status
   * Health check endpoint
   */
  app.get('/api/bouquet/status', (_req: Request, res: Response) => {
    return res.json({
      ok: true,
      assetsAvailable: checkAssetsExist(),
      supportedFlowerCounts: [1, 2, 3, 4, 5],
      supportedCharmShapes: ['coin', 'oval', 'heart', 'round'],
    });
  });

  return httpServer;
}
