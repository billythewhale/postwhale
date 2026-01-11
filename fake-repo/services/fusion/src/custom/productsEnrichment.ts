import { Request, Response } from '@tw/utils/module/express';
import { callPubSub } from '@tw/utils/module/pubsub';
import { getSecret } from '@tw/utils/module/secrets';
import {
  constructPipeline,
  Pipeline,
  PubSubSource,
  MongoDbSink,
  MongoDbSinkInput,
  NonRetryableError,
} from '@tw/saber';
import { logger } from '@tw/utils/module/logger';
import { ProductsEnrichment, productsEnrichmentSchema } from './types/productsEnrichment';
import { handleError } from './utils/errors';
import { shopDataDcl } from '@tw/utils/module/dcl';
import { callServiceEndpoint } from '@tw/utils/module/callServiceEndpoint';

export async function customProductsEnrichment(req: Request, res: Response, bulk?: boolean) {
  let { body } = req;
  logger.info('Received products enrichment', body.shop, JSON.stringify(body));
  try {
    body = await validateProductsEnrichment(body);
    logger.info(`Products enrichment validated: shop: ${body.shop} product_id: ${body.product_id}`);
    body.user = req.user;
    await callPubSub('api-custom-products-enrichment', body);
    res.status(200).send({ success: true, message: 'products enrichment received' });
  } catch (e) {
    return handleError(e, res);
  }
}

constructPipeline(() => {
  const p = new Pipeline(
    'api-custom-products-enrichment-pipeline',
    new PubSubSource({ subscriptionName: 'api-custom-products-enrichment-sub' }),
  )
    .setMessageProperties((data) => {
      return { accountId: [data.data.shop], integrationId: data.data.shop };
    })
    .apply((data) => data.data)
    .apply(async (productsEnrichment: ProductsEnrichment) => {
      const shopDoc = await shopDataDcl.fetchMethod({
        shopId: productsEnrichment.shop,
      });
      if (Object.keys(shopDoc).length === 0) {
        throw new NonRetryableError('Shop not found');
      }
      const { msp } = shopDoc;

      return { ...productsEnrichment, msp };
    });

  const { shopify } = p.split((data) => data.msp, ['shopify'], 'split-by-msp');

  shopify
    .filter((data) => !!data.variant_cost)
    .apply(async (data) => {
      const { shop, product_id, variant_id, variant_cost } = data;
      await callServiceEndpoint(
        'shopify',
        'update-product-variants',
        {
          attributes: {
            shopId: shop,
            dataType: 'shopify_product_variants',
            msp: 'shopify',
          },
          data: {
            id: Number(variant_id),
            product_cost: variant_cost,
            product_id: Number(product_id),
          },
        },
        { method: 'POST', deployment: 'webhooks' },
      );
    });

  return p.pipeline;
});

async function validateProductsEnrichment(body: any): Promise<ProductsEnrichment> {
  return productsEnrichmentSchema.parse(body);
}
