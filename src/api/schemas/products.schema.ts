import { z } from 'zod';

// Shape verified against real responses on 2026-11-21: `status` is the string "ok",
// and the product list lives at `result.data` (the assignment calls it `status.result.data`).

const MoneySchema = z.object({
  amount: z.number(),
  currency: z.string(),
});

const PricingSchema = z
  .object({
    price: MoneySchema,
    listPrice: MoneySchema,
    label: z.string(),
    description: z.string(),
  })
  .passthrough();

export const ProductSchema = z
  .object({
    id: z.string().min(1),
    name: z.string().min(1),
    title: z.string(),
    type: z.string(),
    isService: z.enum(['true', 'false']),
    brand: z.string(),
    description: z.string(),
    inventoryKey: z.string(),
    extras: z.array(z.unknown()),
    addons: z.array(z.unknown()),
    categoryNameTree: z.array(z.unknown()),
    mediaCollection: z.array(z.unknown()),
    pricing: PricingSchema,
    availability: z.record(z.unknown()),
    status: z.string().optional(),
    categoryId: z.string().optional(),
    configuration: z.record(z.unknown()).optional(),
    attributes: z.record(z.unknown()).optional(),
    metadata: z.record(z.unknown()).optional(),
    properties: z.array(z.unknown()).optional(),
    skuData: z.array(z.unknown()).optional(),
    translations: z.array(z.unknown()).optional(),
  })
  .passthrough();

export const ProductsResponseSchema = z
  .object({
    status: z.literal('ok'),
    result: z
      .object({
        total_count: z.number().int().nonnegative(),
        count_by_category: z.record(z.unknown()),
        data: z.array(ProductSchema),
      })
      .passthrough(),
  })
  .passthrough();

export type Product = z.infer<typeof ProductSchema>;
export type ProductsResponse = z.infer<typeof ProductsResponseSchema>;
