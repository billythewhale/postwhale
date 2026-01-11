import { z } from 'zod';

export const productsEnrichmentSchema = z
  .object({
    shop: z.string().min(1, 'Shop Domain is required'),
    product_id: z.string().min(1, 'Product ID is required'),
    variant_id: z.string().min(1, 'Variant ID is required'),
    variant_cost: z.number().nonnegative('Cost Price must be non-negative').optional().nullable(),
    variant_inventory_quantity: z.number().optional(),
  })
  .passthrough()
  .strip();

export type ProductsEnrichment = z.infer<typeof productsEnrichmentSchema>;
