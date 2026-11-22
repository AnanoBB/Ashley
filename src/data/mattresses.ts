import type { CatalogProduct } from '../api/schemas/catalog.schema';

/** Static facts about each mattress that the API does not provide (routes and UI test ids). */
export const MATTRESSES = {
  essential: {
    apiName: 'awara-natural-luxury-hybrid-mattress',
    path: '/mattresses/essential-latex-hybrid-mattress',
    menuCardTestId: 'navi_card_awara_essential_hybrid_mattress',
  },
  classic: {
    apiName: 'the-awara-hybrid-mattress-30',
    path: '/mattress',
    menuCardTestId: 'navi_card_awara_classic_hybrid_mattress',
  },
  premier: {
    apiName: 'awara-premier-hybrid-mattress-30',
    path: '/mattresses/premier-luxury-hybrid-mattress',
    menuCardTestId: 'navi_card_awara_premier_hybrid_mattress',
  },
} as const;

export type MattressKey = keyof typeof MATTRESSES;
export const MATTRESS_KEYS = Object.keys(MATTRESSES) as MattressKey[];

export interface MattressSize {
  value: string;
  title: string;
  priceCents: number;
}

export type Mattress = (typeof MATTRESSES)[MattressKey] & {
  title: string;
  sizes: MattressSize[];
};

export type MattressCatalog = Record<MattressKey, Mattress>;

function toMattress(key: MattressKey, product: CatalogProduct): Mattress {
  const sizeProperty = product.properties.find((property) => property.name === 'Size');
  if (!sizeProperty) {
    throw new Error(`Catalog product "${product.name}" has no Size property`);
  }
  return {
    ...MATTRESSES[key],
    title: product.title,
    sizes: sizeProperty.options.map((option) => ({
      value: option.value,
      title: option.title,
      priceCents: product.pricing.price.amount + option.priceDiff,
    })),
  };
}

export function buildMattressCatalog(products: CatalogProduct[]): MattressCatalog {
  const byName = new Map(products.map((product) => [product.name, product]));
  const entries = MATTRESS_KEYS.map((key) => {
    const product = byName.get(MATTRESSES[key].apiName);
    if (!product) {
      throw new Error(`Catalog response is missing "${MATTRESSES[key].apiName}"`);
    }
    return [key, toMattress(key, product)] as const;
  });
  return Object.fromEntries(entries) as MattressCatalog;
}

export function sizeOf(mattress: Mattress, title: string): MattressSize {
  const size = mattress.sizes.find((candidate) => candidate.title === title);
  if (!size) {
    throw new Error(`${mattress.title} has no size "${title}"`);
  }
  return size;
}

export function cheapestSize(mattress: Mattress): MattressSize {
  const [first, ...rest] = mattress.sizes;
  if (!first) {
    throw new Error(`${mattress.title} has no sizes`);
  }
  return rest.reduce((min, size) => (size.priceCents < min.priceCents ? size : min), first);
}
