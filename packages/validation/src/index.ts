export * from './product';
export * from './post';
export * from './common';

// Export post schemas explicitly
export {
  postCreateSchema,
  postUpdateSchema,
  postCategoryCreateSchema,
  postCategoryUpdateSchema,
  postTagCreateSchema,
  postTagUpdateSchema,
  postSearchSchema,
} from './post';

// Validation utilities
export { z } from 'zod';

export const validateRequest = <T>(schema: any, data: unknown): { success: true; data: T } | { success: false; errors: string[] } => {
  const result = schema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { 
    success: false, 
    errors: result.error.errors.map((e: any) => `${e.path.join('.')}: ${e.message}`)
  };
};