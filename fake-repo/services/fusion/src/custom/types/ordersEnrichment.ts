import { z } from 'zod';

export const ordersEnrichmentSchema = z
  .object({
    shop: z.string().min(1, 'Shop Domain is required'),
    platform: z.string().optional(),
    order_id: z.string().min(1, 'Order ID is required'),
    shipping_costs: z
      .number()
      .nonnegative('Shipping Costs must be non-negative')
      .optional()
      .nullable(),
    custom_expenses: z.number().optional().nullable(),
    custom_gross_sales: z.number().optional().nullable(),
    custom_net_revenue: z.number().optional().nullable(),
    custom_gross_profit: z.number().optional().nullable(),
    orders_quantity: z
      .number()
      .min(0, 'Orders Quantity must be non-negative')
      .max(1, 'Orders Quantity must be 1')
      .optional()
      .nullable(),
    total_items_quantity: z
      .number()
      .nonnegative('Total Items Quantity must be non-negative')
      .optional()
      .nullable(),
    custom_status: z.string().optional().nullable(),
    custom_number: z.number().optional().nullable(),
    custom_string: z.string().optional().nullable(),
    currency: z.string().optional(),
    ignore_order: z.boolean().optional().default(false),
  })
  .passthrough()
  .strip();

export type OrdersEnrichment = z.infer<typeof ordersEnrichmentSchema>;
