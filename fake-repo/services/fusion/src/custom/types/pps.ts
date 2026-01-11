import { z } from 'zod';
import { CUSTOM_PLATFORM, CUSTOM_PLATFORM_ACCOUNT } from './constants';

export const ppsSchema = z
  .object({
    shop: z.string().min(1, 'Shop Domain is required'),
    platform: z
      .string()
      .optional()
      .describe('Platform, e.g., kno, fairing, etc.')
      .default(CUSTOM_PLATFORM),
    platform_account_id: z
      .string()
      .optional()
      .describe('Platform ID, e.g., kno, fairing, etc.')
      .default(CUSTOM_PLATFORM_ACCOUNT),
    order_id: z.string().min(1, 'Order ID is required'),
    created_at: z.string().datetime({ offset: true }).optional().default(new Date().toISOString()),
    total_price: z.number().optional(),
    question_id: z.string().optional(),
    question_text: z.string().optional(),
    response_id: z.string().optional(),
    response: z.string().optional(),

    include_in_attribution: z.boolean().optional(),
    source: z.string().optional(),

    void: z.boolean().optional().default(false),
  })
  .passthrough()
  .strip();

export type Pps = z.infer<typeof ppsSchema>;
