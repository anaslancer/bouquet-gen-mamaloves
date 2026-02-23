import { z } from "zod";

export const DUTCH_MONTHS = [
  'Januari', 'Februari', 'Maart', 'April', 'Mei', 'Juni',
  'Juli', 'Augustus', 'September', 'Oktober', 'November', 'December'
] as const;

export type DutchMonth = typeof DUTCH_MONTHS[number];

export type CharmShape = 'coin' | 'oval' | 'heart' | 'round';

export const generateBouquetSchema = z.object({
  flowers: z.array(z.string()).min(1).max(5),
  charmShape: z.enum(['coin', 'oval', 'heart', 'round']).default('coin'),
});

export type GenerateBouquetRequest = z.infer<typeof generateBouquetSchema>;

export const generatePosterSchema = z.object({
  flowers: z.array(z.string()).min(1).max(5),
  charmShape: z.enum(['coin', 'oval', 'heart', 'round']).default('coin'),
  title: z.string().optional(),
  names: z.string().optional(),
});

export type GeneratePosterRequest = z.infer<typeof generatePosterSchema>;
