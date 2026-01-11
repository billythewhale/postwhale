import { z } from 'zod';
import { CUSTOM_MSP_ACCOUNT, CUSTOM_MSP_PLATFORM } from './constants';

export const customerSchema = z
  .object({
    shop: z.string().min(1, 'Shop Domain is required'),
    platform: z
      .string()
      .optional()
      .describe('Platform, e.g., Shopify, Magento, WooCommerce')
      .default(CUSTOM_MSP_PLATFORM),
    platform_account_id: z
      .string()
      .optional()
      .describe('Platform ID, e.g., Shopify Store ID')
      .default(CUSTOM_MSP_ACCOUNT),
    customer_id: z.string().min(1, 'Customer ID is required'),
    address1: z.string().optional(),
    address2: z.string().optional(),
    amount_spent: z.number().optional(),
    city: z.string().optional(),
    country: z.string().optional(),
    country_code: z.string().optional(),
    created_at: z.string().datetime({ offset: true }).optional().default(new Date().toISOString()),
    customer_tags: z.array(z.string()).optional(),
    display_name: z.string().optional(),
    email_address: z.string().email().optional(),
    email_marketing_consent_collected_from: z.string().optional(),
    email_marketing_consent_opt_in_level: z.string().optional(),
    email_marketing_consent_status: z.string().optional(),
    email_marketing_consent_updated_at: z.string().datetime({ offset: true }).optional(),
    first_name: z.string().optional(),
    last_name: z.string().optional(),
    last_order_id: z.string().optional(),
    longitude: z.number().optional(),
    latitude: z.number().optional(),
    locale: z.string().optional(),
    note: z.string().optional(),
    orders: z.number().optional(),
    phone: z.string().optional(),
    product_subscriber_status: z.string().optional(),
    sms_marketing_consent_collected_from: z.string().optional(),
    sms_marketing_consent_opt_in_level: z.string().optional(),
    sms_marketing_consent_updated_at: z.string().datetime({ offset: true }).optional(),
    state: z.string().optional(),
    state_code: z.string().optional(),
    status: z.string().optional(),
    tax_exempt: z.boolean().optional(),
    zip: z.string().optional(),
    //internal field for the time when the order is ingested into the database
    tw_ingest_time: z
      .number()
      .int()
      .positive()
      .optional()
      .transform(() => Date.now()),
    void: z.boolean().optional().default(false),
  })
  .passthrough()
  .strip();

export type Customer = z.infer<typeof customerSchema>;
