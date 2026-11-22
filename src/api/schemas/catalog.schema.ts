import { z } from 'zod';

// Response of the storefront catalog route `GET {BASE_URL}/api/catalog/products?name=a,b,c`.
// Verified on 2026-11-21: same product shape as the products API, wrapped in `{ result: { data } }`.
// Price of a size = `pricing.price.amount` + the size option's `priceDiff` (all amounts in cents).

const SizeOptionSchema = z
  .object({
    value: z.string().min(1),
    title: z.string().min(1),
    priceDiff: z.number().int(),
  })
  .passthrough();

const PropertySchema = z
  .object({
    name: z.string(),
    options: z.array(SizeOptionSchema),
  })
  .passthrough();

export const CatalogProductSchema = z
  .object({
    id: z.string().min(1),
    name: z.string().min(1),
    title: z.string().min(1),
    pricing: z
      .object({
        price: z
          .object({ amount: z.number().int().positive(), currency: z.string() })
          .passthrough(),
      })
      .passthrough(),
    properties: z.array(PropertySchema),
  })
  .passthrough();

export const CatalogResponseSchema = z
  .object({
    result: z.object({ data: z.array(CatalogProductSchema) }).passthrough(),
  })
  .passthrough();

export type CatalogProduct = z.infer<typeof CatalogProductSchema>;
