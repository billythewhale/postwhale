import { z } from 'zod';
import { CUSTOM_MSP_PLATFORM, CUSTOM_MSP_ACCOUNT } from '.';

export const orderSchema = z
  .object({
    shop: z.string().min(1, 'Shop Domain is required'),
    order_id: z.string().min(1, 'Order ID is required'),
    platform: z.string().optional().default(CUSTOM_MSP_PLATFORM),
    platform_account_id: z
      .string()
      .optional()
      .describe('Platform ID, e.g., Facebook Ad Manager ID')
      .default(CUSTOM_MSP_ACCOUNT),
    created_at: z.string().datetime({ offset: true }).min(1, 'Order Date is required'),
    currency: z.string().min(1, 'Order Currency is required'),
    customer: z
      .object({
        id: z.string().min(1, 'Customer ID is required'),
        email: z.string().email().optional().nullable(),
        phone: z.string().nullable().optional(),
        first_name: z.string().optional().nullable(),
        last_name: z.string().optional().nullable(),
      })
      .refine((data) => data.email || data.phone, {
        message: 'At least one of Customer Email and Customer Phone is required',
      }),
    custom_expenses: z.number().optional(),
    discount_amount: z.number().nonnegative('Total Discounts must be non-negative').optional(),
    discount_codes: z
      .array(
        z.object({
          code: z.string().min(1, 'Discount Code is required'),
          amount: z.number().nonnegative('Discount Amount must be non-negative'),
          type: z.string().optional(),
        }),
      )
      .nullable()
      .optional(),
    line_items: z
      .array(
        z.object({
          id: z.string().min(1, 'Line Item ID is required'),
          name: z.string().optional(),
          price: z.number().nonnegative('Line Item Price must be non-negative'),
          quantity: z.number().int().positive('Line Item Quantity must be positive'),
          product_id: z.string().optional().nullable(),
          product_name: z.string().optional().nullable(),
          product_type: z.string().optional().nullable(),
          vendor: z.string().optional().nullable(),
          product_tags: z.array(z.string()).optional().nullable().default([]),
          variant_id: z.string().optional().nullable(),
          variant_name: z.string().optional().nullable(),
          sku: z.string().optional().nullable(),
          tax_lines: z
            .array(
              z.object({
                price: z.number().nullable().optional(),
                rate: z.number().nullable().optional(),
                title: z.string().nullable().optional(),
              }),
            )
            .optional()
            .nullable()
            .default([]),
        }),
      )
      .default([]),
    name: z.string().optional(),
    payment_gateway_names: z.array(z.string()).optional(),
    refunds: z
      .array(
        z.object({
          refund_id: z.string().min(1, 'Refund ID is required'),
          refunded_at: z.string().datetime({ offset: true }).min(1, 'Refund Date is required'),
          line_items: z.array(
            z.object({
              id: z.string().min(1, 'Refund Line Item ID is required'),
              line_item_id: z.string().optional(),
              quantity: z.number().int().positive('Refund Line Item Quantity must be positive'),
              product_id: z.string().optional(),
              variant_id: z.string().optional(),
              price: z.number().nonnegative('Refund Line Item Price must be non-negative'),
              currency: z.string().optional(),
              total_discount: z
                .number()
                .nonnegative('Refund Line Item Discount must be non-negative')
                .optional(),
              tax_lines: z
                .array(
                  z.object({
                    price: z.number().nullable().optional(),
                    rate: z.number().nullable().optional(),
                    title: z.string().nullable().optional(),
                  }),
                )
                .optional()
                .default([]),
            }),
          ),
          total_refund: z.number().nonnegative('Total Refund must be non-negative'),
          total_tax_refund: z
            .number()
            .nonnegative('Total Tax Refund must be non-negative')
            .optional(),
          total_shipping_refund: z
            .number()
            .nonnegative('Total Shipping Refund must be non-negative')
            .optional(),
          tags: z.array(z.string()).optional().default([]),
          void: z.boolean().optional().default(false),
        }),
      )
      .default([]),
    shipping_address: z
      .object({
        address_1: z.string().nullable().optional(),
        address_2: z.string().nullable().optional(),
        zip: z.string().nullable().optional(),
        city: z.string().nullable().optional(),
        country: z.string().nullable().optional(),
        country_code: z.string().nullable().optional(),
        province_code: z.string().nullable().optional(),
        state_code: z.string().nullable().optional(),
      })
      .optional(),
    shipping_lines: z
      .array(
        z.object({
          shipping_discounted_price: z
            .number()
            .nonnegative('Shipping Discounted Price must be non-negative'),
          shipping_price: z.number().nonnegative('Shipping Price must be non-negative'),
          source: z.string().optional(),
          title: z.string().optional(),
          tax_lines: z
            .array(
              z.object({
                price: z.number().nullable().optional(),
                rate: z.number().nullable().optional(),
                title: z.string().nullable().optional(),
              }),
            )
            .optional()
            .default([]),
        }),
      )
      .optional()
      .nullable()
      .default([]),
    shipping_price: z.number().nonnegative('Shipping Price must be non-negative').optional(),
    shipping_costs: z.number().nonnegative('Shipping Cost must be non-negative').optional(),
    source_name: z.string().optional().nullable(),
    subscription_id: z.string().optional(),
    tags: z.array(z.string()).optional(),
    taxes_included: z.boolean().optional().default(false),
    tax_lines: z
      .array(
        z.object({
          price: z.number().nullable().optional(),
          rate: z.number().nullable().optional(),
          title: z.string().nullable().optional(),
        }),
      )
      .optional()
      .default([]),
    order_revenue: z.number().nonnegative('Order Price must be non-negative'),
    total_discounts: z.number().nonnegative('Total Discounts must be non-negative').optional(),
    taxes: z.number().optional(),
    status: z.string().optional(),
    updated_at: z.string().datetime({ offset: true }).optional().default(new Date().toISOString()),
    void: z.boolean().optional().default(false),
    //internal field for the time when the order is ingested into the database
    tw_ingest_time: z
      .number()
      .int()
      .positive()
      .optional()
      .transform(() => Date.now()),
  })
  .passthrough()
  .strip();

export type Order = z.infer<typeof orderSchema>;
