import { z } from 'zod';
import { CUSTOM_MSP_PLATFORM, CUSTOM_MSP_ACCOUNT } from './constants';

export const productSchema = z
  .object({
    shop: z.string().min(1, 'Shop Domain is required'),
    platform: z
      .string()
      .optional()
      .describe('Platform, e.g., Shopify, Magento')
      .default(CUSTOM_MSP_PLATFORM),
    platform_account_id: z
      .string()
      .optional()
      .describe('Platform ID, e.g., Shopify Store ID')
      .default(CUSTOM_MSP_ACCOUNT),

    product_id: z.string().min(1, 'Product ID is required'),
    product_title: z.string().optional(),
    product_name: z.string().optional(),
    vendor: z.string().optional(),
    product_status: z.string().optional().default('active'),
    product_tags: z.array(z.string()).optional(),
    product_type: z.string().optional(),
    collection: z.array(z.string()).optional(),
    collections: z.array(z.string()).optional(),

    images: z
      .array(
        z.object({
          image_id: z.string().min(1, 'Image ID is required'),
          image_src: z.string().min(1, 'Image URL is required'),
        }),
      )
      .optional()
      .default([]),

    variants: z
      .array(
        z
          .object({
            variant_id: z.string().min(1, 'Variant ID is required'),
            variant_title: z.string().optional(),
            variant_name: z.string().optional(),
            variant_price: z.number().optional(),
            sku: z.string().optional(),
            variant_cost: z.number().optional(),
            handling_fee: z.number().optional(),
            inventory_quantity: z.number().optional(),
          })
          .refine(
            (data: any) => !!data.variant_name || !!data.variant_title, //At least one of variant_name or variant_title must exist
            {
              message: 'At least one of variant_name or variant_title is required',
            },
          ),
      )
      .optional()
      .default([]),

    created_at: z.string().datetime({ offset: true }).optional().default(new Date().toISOString()),
    updated_at: z.string().datetime({ offset: true }).optional().default(new Date().toISOString()),
    void: z.boolean().optional().default(false),
    //internal field for the time when the product is ingested into the database
    tw_ingest_time: z
      .number()
      .int()
      .positive()
      .optional()
      .transform(() => Date.now()),
  })
  .passthrough()
  .strip()
  .refine(
    (data: any) => !!data.product_name || !!data.product_title, //At least one of product_name or product_title must exist
    {
      message: 'At least one of product_name or product_title is required',
    },
  );

export type Product = z.infer<typeof productSchema>;
