import { z } from 'zod';

export const IdSchema = z.number().int().positive();
export const PaginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50)
});

export type IdInput = z.infer<typeof IdSchema>;
export type PaginationInput = z.infer<typeof PaginationSchema>;