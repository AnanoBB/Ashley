import { z } from 'zod';

// Error body of the products API for rejected queries (verified 2026-11-22), e.g.
// `{ "status": "error", "error": "No such brand name 'nonexistent'" }` with HTTP 400.
export const ApiErrorSchema = z
  .object({
    status: z.literal('error'),
    error: z.string().min(1),
  })
  .strict();

export type ApiError = z.infer<typeof ApiErrorSchema>;
