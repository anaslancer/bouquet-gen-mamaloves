/**
 * Shared types and validation schemas for bouquet generation
 */

import { z } from "zod";

// Dutch month names as used in Shopify orders
export const DUTCH_MONTHS = [
  'Januari', 'Februari', 'Maart', 'April', 'Mei', 'Juni',
  'Juli', 'Augustus', 'September', 'Oktober', 'November', 'December'
] as const;

export type DutchMonth = typeof DUTCH_MONTHS[number];

// Supported charm shapes
export type CharmShape = 'coin' | 'oval' | 'heart' | 'round';

// Request schema for bouquet generation API
export const generateBouquetSchema = z.object({
  flowers: z.array(z.string()).min(1).max(5),
  charmShape: z.enum(['coin', 'oval', 'heart', 'round']).default('coin'),
});

export type GenerateBouquetRequest = z.infer<typeof generateBouquetSchema>;
