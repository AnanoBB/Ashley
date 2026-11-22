import { z } from 'zod';

// Response of the storefront catalog route `GET {BASE_URL}/api/catalog/products?name=a,b,c`.
// Verified on 2026-11-21: same product shape as the products API, wrapped in `{ result: { data } }`.
// Price of a size = `pricing.price.amount` + the size option's `priceDiff` (all amounts in cents).

const SizeOptionSchema = z.looseObject({
  value: z.string().min(1),
  title: z.string().min(1),
  priceDiff: z.number().int(),
});

const PropertySchema = z.looseObject({
  name: z.string(),
  options: z.array(SizeOptionSchema),
});

export const CatalogProductSchema = z.looseObject({
  id: z.string().min(1),
  name: z.string().min(1),
  title: z.string().min(1),
  pricing: z.looseObject({
    price: z.looseObject({ amount: z.number().int().positive(), currency: z.string() }),
  }),
  properties: z.array(PropertySchema),
});

export const CatalogResponseSchema = z.looseObject({
  result: z.looseObject({ data: z.array(CatalogProductSchema) }),
});

export type CatalogProduct = z.infer<typeof CatalogProductSchema>;
