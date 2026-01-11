import { z } from 'zod';
import { CUSTOM_PLATFORM, CUSTOM_PLATFORM_ACCOUNT } from './constants';

export const subscriptionSchema = z
  .object({
    shop: z.string().min(1, 'Shop Domain is required'),
    subscription_id: z.string().min(1, 'Subscription ID is required'),
    platform: z.string().optional().default(CUSTOM_PLATFORM),
    platform_account_id: z
      .string()
      .optional()
      .describe('Platform ID, e.g., Stripe Account ID')
      .default(CUSTOM_PLATFORM_ACCOUNT),
    created_at: z.string().datetime({ offset: true }).min(1, 'Subscription Date is required'),
    canceled_at: z.string().datetime({ offset: true }).optional(),
    cancelled_at: z.string().datetime({ offset: true }).optional(),
    ended_at: z.string().datetime({ offset: true }).optional(),
    cancelation_reason: z.string().optional(),
    cancelation_comments: z.string().optional(),
    cancellation_reason: z.string().optional(),
    cancellation_comments: z.string().optional(),
    currency: z.string().min(1, 'Subscription Currency is required'),
    customer: z
      .object({
        id: z.string().min(1, 'Customer ID is required'),
        email: z.string().email().optional(),
        phone: z.string().nullable().optional(),
        first_name: z.string().optional(),
        last_name: z.string().optional(),
      })
      .refine((data) => data.email || data.phone, {
        message: 'At least one of Customer Email and Customer Phone is required',
      }),
    subscription_items: z
      .array(
        z.object({
          subscription_item_id: z.string().min(1, 'Subscription Item ID is required'),
          created_at: z
            .string()
            .datetime({ offset: true })
            .min(1, 'Subscription Item Date is required'),
          canceled_at: z.string().datetime({ offset: true }).optional(),
          ended_at: z.string().datetime({ offset: true }).optional(),
          status: z.enum(['active', 'canceled', 'expired', 'deleted', 'trial']),
          interval: z.enum(['day', 'week', 'month', 'year']),
          interval_count: z.number().int().positive(),
          product_id: z.string().optional(),
          price: z.number().nonnegative('Subscription Item Price must be non-negative'),
          quantity: z.number().int().positive('Subscription Item Quantity must be positive'),
          variant_id: z.string().optional(),
          discount: z
            .object({
              amount_off: z.number().nonnegative('Discount Amount must be non-negative').optional(),
              percent_off: z
                .number()
                .nonnegative('Discount Percent must be non-negative')
                .optional(),
            })
            .optional()
            .default({}),
        }),
      )
      .default([]),
    status: z.string(),
    metadata: z.string().optional(),
    updated_at: z.string().datetime({ offset: true }).optional().default(new Date().toISOString()),
    void: z.boolean().optional().default(false),
    //internal field for the time when the subscription is ingested into the database
    tw_ingest_time: z
      .number()
      .int()
      .positive()
      .optional()
      .transform(() => Date.now()),
  })
  .passthrough()
  .strip();

export type Subscription = z.infer<typeof subscriptionSchema>;
