import { z } from 'zod';
import { CUSTOM_MSP_ACCOUNT, CUSTOM_MSP_PLATFORM } from './constants';

export const shippingSchema = z
  .object({
    shop: z.string().min(1, 'Shop Domain is required'),
    platform: z
      .string()
      .optional()
      .describe('Platform, e.g., shipbob, etc.')
      .default(CUSTOM_MSP_PLATFORM),
    platform_account_id: z
      .string()
      .optional()
      .describe('Platform ID, e.g., kno, fairing, etc.')
      .default(CUSTOM_MSP_ACCOUNT),
    order_id: z.string().min(1, 'Order ID is required'),
    shipping_costs: z.number().nonnegative('Shipping Costs must be non-negative'),
  })
  .passthrough()
  .strip();

export type Shipping = z.infer<typeof shippingSchema>;
