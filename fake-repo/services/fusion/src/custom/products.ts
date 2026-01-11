import { Request, Response } from '@tw/utils/module/express';
import { callPubSub } from '@tw/utils/module/pubsub';
import { getSecret } from '@tw/utils/module/secrets';
import {
  constructPipeline,
  Pipeline,
  PubSubSource,
  MongoDbSink,
  MongoDbSinkInput,
  PubSubSink,
} from '@tw/saber';
import { logger } from '@tw/utils/module/logger';
import { CUSTOM_MSP_PLATFORM, CUSTOM_MSP_ACCOUNT, Product, productSchema } from './types';
import { createSonicStreamPipeline } from '@tw/sonic-tools';
import { resolveIntegration } from './utils/integrations';
import { handleError } from './utils/errors';
import { addTimelineItem } from '@tw/utils/module/timeline';
import moment from 'moment';
import { hasValue, mapTimelineToCH } from './utils/util';

export async function customProducts(req: Request, res: Response, bulk?: boolean) {
  let { body } = req;
  logger.info('Received product', body.shop, JSON.stringify(body));
  try {
    body = await validateProduct(body);
    logger.info(`Product validated: shop: ${body.shop} product_id: ${body.product_id}`);
    body.user = req.user;
    await callPubSub('api-custom-products', body);
    res.status(200).send({ success: true, message: 'product received' });
  } catch (e) {
    return handleError(e, res);
  }
}

constructPipeline(() => {
  const productsMongoSink = new MongoDbSink({
    connectorArgs: { url: getSecret('MONGODB_URL'), db: 'api-custom-pipeline' },
    collection: 'custom-products',
  })
    .index({ integration_id: 1, product_id: 1 }, { unique: true, name: 'integration_product_id' })
    .index({ shop: 1, product_id: 1 }, { name: 'shop_product_id' })
    .index({ integration_id: 1, tw_ingest_time: -1 }, { name: 'integration_id_tw_ingest_time' });
  const variantsMongoSink = new MongoDbSink({
    connectorArgs: { url: getSecret('MONGODB_URL'), db: 'api-custom-pipeline' },
    collection: 'custom-variants',
  })
    .index({ shop: 1, product_id: 1, variant_id: 1 }, { name: 'shop_product_variant_id' })
    .index(
      { integration_id: 1, product_id: 1, variant_id: 1 },
      { name: 'integration_product_variant_id', unique: true },
    );

  const p = new Pipeline(
    'api-custom-products-pipeline',
    new PubSubSource({ subscriptionName: 'api-custom-products-sub' }),
  )
    .setMessageProperties((data) => {
      return { accountId: [data.data.shop], integrationId: data.data.shop };
    })
    .apply((data) => data.data)
    .apply(async (product: Product) => {
      const integrationId = await resolveIntegration({
        shop: product.shop,
        asset: 'orders',
        channel: product?.platform ?? CUSTOM_MSP_PLATFORM,
        account: product?.platform_account_id ?? CUSTOM_MSP_ACCOUNT,
      });
      return { ...product, integration_id: integrationId };
    });

  p.apply(
    MongoDbSink.createUpdateOneTransform((product: Product & { integration_id: string }) => ({
      integration_id: product.integration_id,
      product_id: product.product_id,
    })),
  ).addSink(productsMongoSink);

  p.apply((product: Product) => {
    return product.variants.map((variant) => {
      return {
        shop: product.shop,
        platform: product.platform ?? CUSTOM_MSP_PLATFORM,
        platform_account_id: product.platform_account_id ?? CUSTOM_MSP_ACCOUNT,
        integration_id: (product as Product & { integration_id: string }).integration_id,
        product_id: product.product_id,
        ...variant,
        void: product.void,
      };
    });
  })
    .apply(
      MongoDbSink.createUpdateOneTransform((variant) => ({
        integration_id: variant.integration_id,
        product_id: variant.product_id,
        variant_id: variant.variant_id,
      })),
    )
    .addSink(variantsMongoSink);

  p.apply((product: Product) => {
    return {
      bu_id: product.shop,
      provider_account: product.platform_account_id ?? CUSTOM_MSP_ACCOUNT,
      account_id: product.platform_account_id ?? CUSTOM_MSP_ACCOUNT,
      provider_id: product.platform ?? CUSTOM_MSP_PLATFORM,
      integration_id: (product as Product & { integration_id: string }).integration_id,
      product_id: product.product_id,
      product_title: product.product_name ?? product.product_title,
      product_status: product.product_status,
      product_type: product.product_type,
      product_tags: product.product_tags,
      options: [],
      vendor: product.vendor,
      images: product.images,
      tw_main_product_image_src: product.images?.[0]?.image_src,
      variant_ids: product.variants.map((variant) => variant.variant_id).filter(Boolean),
      tw_product_inventory_quantity: product.variants.reduce(
        (acc, variant) => acc + (variant.inventory_quantity ?? 0),
        0,
      ),
    };
  }).extend(createSonicStreamPipeline({ name: 'products' }));

  p.apply((product: Product) => {
    return {
      bu_id: product.shop,
      provider_account: product.platform_account_id ?? CUSTOM_MSP_ACCOUNT,
      account_id: product.platform_account_id ?? CUSTOM_MSP_ACCOUNT,
      provider_id: product.platform ?? CUSTOM_MSP_PLATFORM,
      integration_id: (product as Product & { integration_id: string }).integration_id,
      product_id: product.product_id,
      collections: product.collections ?? product.collection,
    };
  }).extend(createSonicStreamPipeline({ name: 'products-in-collections' }));

  p.apply((product: Product) => {
    return product.collections?.map((collection) => {
      return {
        integration_id: (product as Product & { integration_id: string }).integration_id,
        provider_account: product.platform_account_id ?? CUSTOM_MSP_ACCOUNT,
        account_id: product.platform_account_id ?? CUSTOM_MSP_ACCOUNT,
        provider_id: product.platform ?? CUSTOM_MSP_PLATFORM,
        updated_at: moment.utc().format('YYYY-MM-DD HH:mm:ss'),
        collection_id: collection,
        collection_name: collection,
        handle: collection,
        collection_type: 'manual',
      };
    });
  }).extend(createSonicStreamPipeline({ name: 'product-collections' }));

  p.apply((product: Product) => {
    return product.variants.map((variant) => {
      return {
        bu_id: product.shop,
        provider_account: product.platform_account_id ?? CUSTOM_MSP_ACCOUNT,
        account_id: product.platform_account_id ?? CUSTOM_MSP_ACCOUNT,
        provider_id: product.platform ?? CUSTOM_MSP_PLATFORM,
        integration_id: (product as Product & { integration_id: string }).integration_id,
        product_id: product.product_id,
        variant_id: variant.variant_id,
        variant_title: variant.variant_name ?? variant.variant_title,
        variant_price: variant.variant_price,
        variant_inventory_quantity: variant.inventory_quantity,
        sku: variant.sku,
      };
    });
  }).extend(createSonicStreamPipeline({ name: 'variants' }));

  p.apply((product: Product) =>
    product.variants.map((variant): [Product, Product['variants'][number]] => [product, variant]),
  )
    .apply(async ([product, variant]) => {
      const currentObject: any = await variantsMongoSink.collection.findOne({
        integration_id: (product as Product & { integration_id: string }).integration_id,
        product_id: product.product_id,
        variant_id: variant.variant_id,
      });
      let costs = currentObject?.costs ?? [];
      const { costDate = moment().toDate() } = currentObject ?? {};
      const affectedRanges = [];

      if (hasValue(variant.variant_cost)) {
        const costsNewTL = addTimelineItem(costs, {
          value: Number(variant.variant_cost),
          date: costDate,
          type: 'API',
        });

        costs = costsNewTL.timeline;
        if (costsNewTL?.affectedRange) affectedRanges.push(costsNewTL?.affectedRange);
        (variant as any).costs = costs;
      }

      let handlingFees = currentObject?.handling_fees ?? [];
      if (hasValue(variant.handling_fee)) {
        const handlingFeesNewTL = addTimelineItem(handlingFees, {
          value: Number(variant.handling_fee),
          date: costDate,
          type: 'API',
        });
        handlingFees = handlingFeesNewTL.timeline;
        if (handlingFeesNewTL?.affectedRange) affectedRanges.push(handlingFeesNewTL?.affectedRange);
        (variant as any).handling_fees = handlingFees;
      }

      return {
        updateOne: {
          filter: {
            integration_id: (product as Product & { integration_id: string }).integration_id,
            product_id: product.product_id,
            variant_id: variant.variant_id,
          },
          update: {
            $set: {
              shop: product.shop,
              platform: product.platform ?? CUSTOM_MSP_PLATFORM,
              platform_account_id: product.platform_account_id ?? CUSTOM_MSP_ACCOUNT,
              integration_id: (product as Product & { integration_id: string }).integration_id,
              product_id: product.product_id,
              variant_id: variant.variant_id,
              costs: costs,
              handling_fees: handlingFees,
            },
          },
          upsert: true,
        },
      } as MongoDbSinkInput;
    })
    .addSink(variantsMongoSink)
    .apply((data: any) => {
      data = data.updateOne.update.$set;
      const chCosts = data?.costs?.map((c: any) => mapTimelineToCH(c)) ?? [];
      const chHandlingFees = data?.handling_fees?.map((c: any) => mapTimelineToCH(c)) ?? [];
      return {
        headers: {
          shopId: data.shop,
        },
        data: {
          msp: 'custom-msp',
          shopId: data.shop,
          id: data.variant_id,
          productId: data.product_id,
          type: 'variant',
          costs: chCosts,
          handlingFees: chHandlingFees,
          integrationId: data.integration_id,
        },
      };
    })
    .addSink(new PubSubSink({ topicName: 'shopify-timeline-update-variant' }));

  return p.pipeline;
});

async function validateProduct(product: any): Promise<Product> {
  return await productSchema.parse(product);
}
