import { Router, apiConfig, type OpenApi } from '@tw/utils/module/express';
import { endpointWrapper } from '@tw/utils/module/api';
import { customOrders } from './orders';
import { customAds } from './ads';
import { customProducts } from './products';
import { customSubscriptions } from './subscriptions';
import { customPps } from './pps';
import { customShipping } from './shipping';
import { customOrderEnrichment } from './ordersEnrichment';
import { customCustomers } from './customers';
import { registerIntegration } from './utils/integrations';
import { customProductsEnrichment } from './productsEnrichment';
import { callServiceEndpoint } from '@tw/utils/module/callServiceEndpoint';
import { Request, Response } from '@tw/utils/module/express';

export const customRouter = Router();

type AssetConfig = {
  func: (req: Request, res: Response, bulk?: boolean) => Promise<any>;
  security: NonNullable<OpenApi['security']>;
  bulk?: boolean;
};

const assetTypeMap: Record<string, AssetConfig> = {
  orders: { func: customOrders, security: { apiKey: ['orders:write'] }, bulk: true },
  customers: { func: customCustomers, security: { apiKey: ['customers:write', 'orders:write'] } },
  ads: { func: customAds, security: { apiKey: ['ads:write'], hydra: ['ads:write'] } },
  products: { func: customProducts, security: { apiKey: ['products:write'] } },
  subscriptions: { func: customSubscriptions, security: { apiKey: ['subscriptions:write'] } },
  pps: { func: customPps, security: { apiKey: ['pps:write'] } },
  shipping: { func: customShipping, security: { apiKey: ['shipping:write'] } },
  'orders-enrichment': {
    func: customOrderEnrichment,
    security: { apiKey: ['orders:write'] },
  },
  'products-enrichment': {
    func: customProductsEnrichment,
    security: { apiKey: ['products:write'] },
  },
};

Object.entries(assetTypeMap)
  .map(([asset, values]) => {
    if (!values.bulk) {
      return [{ asset, values }];
    }
    return [
      { asset, values: { ...values, bulk: false } },
      { asset, values: { ...values, bulk: true } },
    ];
  })
  .flat()
  .forEach(({ asset, values }) => {
    customRouter.post(
      `/${values.bulk ? 'bulk-' : ''}${asset}`,
      apiConfig({
        openApi: {
          interfaces: ['public'],
          security: values.security,
          overwriteExternalPath: { prefix: 'data-in' },
          ...(values.bulk ? { deployment: 'bulk' } : {}),
        },
        auth: { serviceId: 'triple-whale', accountIds: (req) => req.body.shop },
        rateLimits: [
          { window: 1, quota: 500 },
          { window: 60, quota: 25000 },
        ],
      }),
      endpointWrapper((req, res) => values.func(req, res, values.bulk ?? false)),
    );
  });

customRouter.post('/register-integrations', async (req, res) => {
  await registerIntegration(req, res);
});

customRouter.post(
  '/healthcheck/stats',
  apiConfig({
    openApi: { interfaces: ['client'], security: { firebase: [] } },
    auth: { serviceId: 'triple-whale', accountIds: (req) => req.body.shopId },
  }),
  endpointWrapper(async (req, res) => {
    const { shopId } = req.body;
    const { data } = await callServiceEndpoint(
      'api-fetcher',
      'healthcheck/stats',
      { shopId },
      { method: 'POST' },
    );
    return res.status(200).json(data);
  }),
);
