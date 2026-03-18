import { z } from "zod";

export const DUTCH_MONTHS = [
  'Januari', 'Februari', 'Maart', 'April', 'Mei', 'Juni',
  'Juli', 'Augustus', 'September', 'Oktober', 'November', 'December'
] as const;

export type DutchMonth = typeof DUTCH_MONTHS[number];

export type CharmShape = 'coin' | 'oval' | 'heart' | 'round' | 'poster';

export const generateBouquetSchema = z.object({
  flowers: z.array(z.string()).min(1).max(5),
  charmShape: z.enum(['coin', 'oval', 'heart', 'round', 'poster']).default('coin'),
});

export type GenerateBouquetRequest = z.infer<typeof generateBouquetSchema>;

export const generatePosterSchema = z.object({
  flowers: z.array(z.string()).min(1).max(5),
  charmShape: z.enum(['coin', 'oval', 'heart', 'round', 'poster']).default('coin'),
  title: z.string().optional(),
  names: z.string().optional(),
});

export type GeneratePosterRequest = z.infer<typeof generatePosterSchema>;

export const multiPagePosterPageSchema = z.object({
  flowers: z.array(z.string()).min(1).max(5),
  charmShape: z.enum(['coin', 'oval', 'heart', 'round', 'poster']).default('coin'),
  title: z.string().optional(),
  names: z.string().optional(),
});

export const generateMultiPagePosterSchema = z.object({
  pages: z.array(multiPagePosterPageSchema).min(1),
});

export type GenerateMultiPagePosterRequest = z.infer<typeof generateMultiPagePosterSchema>;
