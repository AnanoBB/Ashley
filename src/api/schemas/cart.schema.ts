import { z } from 'zod';
import { MoneySchema } from './products.schema';

// Response of `POST {API_URL}/carts/my/items` as observed from the storefront (2026-11-21).
export const CartResponseSchema = z.looseObject({
  status: z.literal('ok'),
  result: z.looseObject({
    id: z.string().min(1),
    itemsCount: z.number().int().nonnegative(),
    totalPrice: MoneySchema,
    items: z.array(
      z.looseObject({
        sku: z.string().min(1),
        quantity: z.number().int().positive(),
      }),
    ),
  }),
});
