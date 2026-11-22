import { z } from 'zod';

// Shape verified against real responses on 2026-11-21: `status` is the string "ok",
// and the product list lives at `result.data` (the assignment calls it `status.result.data`).

export const MoneySchema = z.object({
  amount: z.number().int().nonnegative(), // cents
  currency: z.string().min(1),
});

const PricingSchema = z.looseObject({
  price: MoneySchema,
  listPrice: MoneySchema,
  label: z.string(),
  description: z.string(),
});

export const ProductSchema = z.looseObject({
  id: z.string().min(1),
  name: z.string().min(1),
  title: z.string(),
  type: z.string(),
  isService: z.enum(['true', 'false']),
  brand: z.string().min(1),
  description: z.string(),
  inventoryKey: z.string(),
  extras: z.array(z.unknown()),
  addons: z.array(z.unknown()),
  categoryNameTree: z.array(z.unknown()),
  mediaCollection: z.array(z.unknown()),
  pricing: PricingSchema,
  availability: z.record(z.string(), z.unknown()),
  status: z.string().optional(),
  categoryId: z.string().optional(),
  configuration: z.record(z.string(), z.unknown()).optional(),
  attributes: z.record(z.string(), z.unknown()).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
  properties: z.array(z.unknown()).optional(),
  skuData: z.array(z.unknown()).optional(),
  translations: z.array(z.unknown()).optional(),
});

export const ProductsResponseSchema = z.looseObject({
  status: z.literal('ok'),
  result: z.looseObject({
    total_count: z.number().int().nonnegative(),
    count_by_category: z.record(z.string(), z.unknown()),
    data: z.array(ProductSchema),
  }),
});

export type ProductsResponse = z.infer<typeof ProductsResponseSchema>;
