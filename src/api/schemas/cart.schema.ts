import { z } from 'zod';

const MoneySchema = z.object({ amount: z.number().int(), currency: z.string() }).passthrough();

// Response of `POST {API_URL}/carts/my/items` as observed from the storefront (2026-11-21).
export const CartResponseSchema = z
  .object({
    status: z.literal('ok'),
    result: z
      .object({
        id: z.string().min(1),
        itemsCount: z.number().int().nonnegative(),
        totalPrice: MoneySchema,
        items: z.array(
          z
            .object({
              sku: z.string().min(1),
              quantity: z.number().int().positive(),
            })
            .passthrough(),
        ),
      })
      .passthrough(),
  })
  .passthrough();
