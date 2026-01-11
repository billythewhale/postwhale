import { Router } from 'express';
import { apiConfig } from '@tw/utils/module/express';
import {
  createEndpoint,
  debugLogsWithDataMw,
  type WithShopIdFromHeader,
  type WithQuery,
  type WithUser,
} from '@tw/utils/module/api/endpoint';
import { getSession, type GetSessionRequestQuery } from './getSession';
import { listSessions } from './list';
import { getBranch, type GetBranchRequestQuery } from './branch';
import type { ListSessionsRequestQuery } from '@tw/shared-types';

export function getSessionsRouter(): Router {
  const router = Router();
  router.use(debugLogsWithDataMw('debug'));

  router.get(
    '/get',
    apiConfig({
      openApi: {
        interfaces: ['client'],
        security: { firebase: [] },
      },
      auth: {
        serviceId: 'shopify',
        accountIds: (req) => req.headers['x-tw-shop-id'] ?? '',
      },
    }),
    createEndpoint<WithShopIdFromHeader & WithUser & WithQuery<GetSessionRequestQuery>>(getSession),
  );

  router.get(
    '/list',
    apiConfig({
      openApi: {
        interfaces: ['client'],
        security: { firebase: [] },
      },
      auth: {
        serviceId: 'shopify',
        accountIds: (req) => req.headers['x-tw-shop-id'] ?? '',
      },
    }),
    createEndpoint<WithShopIdFromHeader & WithUser & WithQuery<ListSessionsRequestQuery>>(
      listSessions,
    ),
  );

  router.get(
    '/branch',
    apiConfig({
      openApi: {
        interfaces: ['client'],
        security: { firebase: [] },
      },
      auth: {
        serviceId: 'shopify',
        accountIds: (req) => req.headers['x-tw-shop-id'] ?? '',
      },
    }),
    createEndpoint<WithShopIdFromHeader & WithUser & WithQuery<GetBranchRequestQuery>>(getBranch),
  );

  return router;
}
