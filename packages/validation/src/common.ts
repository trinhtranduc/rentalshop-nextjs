import { z } from 'zod';

export const IdSchema = z.number().int().positive();
// Coerce string to number for query parameters (URL params are always strings)
export const PaginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20)
});

export type IdInput = z.infer<typeof IdSchema>;
export type PaginationInput = z.infer<typeof PaginationSchema>;