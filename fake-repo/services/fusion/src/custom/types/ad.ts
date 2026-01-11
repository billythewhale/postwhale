import { z } from 'zod';
import { CUSTOM_CHANNEL } from './constants';

export const adsSchema = z
  .object({
    shop: z.string().min(1, 'Shop Domain is required'),
    channel: z.string().min(1, 'Channel is required'),
    channel_account_id: z
      .string()
      .optional()
      .describe('Platform ID, e.g., Facebook Ad Manager ID')
      .default(CUSTOM_CHANNEL),
    event_date: z
      .string()
      .describe('Event Date in local timezone')
      .refine((value) => !isNaN(Date.parse(value)), {
        message:
          'Invalid date format. Provide a valid date string (e.g., YYYY-MM-DD or ISO format).',
      }),
    currency: z.string().min(1, 'Currency is required'),

    campaign: z
      .object({
        id: z.string().min(1, 'Campaign ID is required'),
        name: z.string().min(1, 'Campaign Name is required'),
        status: z.enum(['PAUSED', 'ACTIVE'], {
          errorMap: () => ({ message: 'Campaign Status must be PAUSED or ACTIVE' }),
        }),
      })
      .optional(),

    adset: z
      .object({
        id: z.string().min(1, 'Ad Group is required'),
        name: z.string().min(1, 'Ad Group Name is required'),
        status: z.enum(['PAUSED', 'ACTIVE'], {
          errorMap: () => ({ message: 'Ad Group Status must be PAUSED or ACTIVE' }),
        }),
      })
      .optional(),

    ad: z
      .object({
        id: z.string().min(1, 'Ad ID is required'),
        name: z.string().min(1, 'Ad Name is required'),
        status: z.enum(['PAUSED', 'ACTIVE'], {
          errorMap: () => ({ message: 'Ad Status must be PAUSED or ACTIVE' }),
        }),
        thumbnail: z.string().optional(),
        ad_image_url: z.string().optional(),
      })
      .optional(),

    metrics: z
      .object({
        clicks: z.number().optional(),
        conversions: z.number().optional(),
        conversion_value: z.number().optional(),
        impressions: z.number().optional(),
        spend: z.number().optional(),
        visits: z.number().optional(),
      })
      .optional()
      .default({
        clicks: 0,
        conversions: 0,
        conversion_value: 0,
        impressions: 0,
        spend: 0,
        visits: 0,
      }),

    updated_at: z.string().datetime({ offset: true }).optional().default(new Date().toISOString()),
    void: z.boolean().optional().default(false),
  })
  .passthrough()
  .strip()
  .refine(
    (data) => !!data.campaign?.id || !!data.adset?.id || !!data.ad?.id, // At least one ID must exist
    {
      message: 'At least one ID must exist for campaign, adset, or ad.',
    },
  );

export type Ad = z.infer<typeof adsSchema>;
