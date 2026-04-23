import { z } from 'zod';
import { emailSchema } from './auth.js';

export const createRecipientSchema = z.object({
  email: emailSchema,
  name: z.string().trim().min(1).max(120),
});
export type CreateRecipientInput = z.infer<typeof createRecipientSchema>;

export interface Recipient {
  id: string;
  email: string;
  name: string;
  created_at: string;
}

export interface Paginated<T> {
  data: T[];
  page: number;
  pageSize: number;
  total: number;
}

export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
});
export type PaginationQuery = z.infer<typeof paginationQuerySchema>;
