import { initRuntime } from '@tw/utils/module/runtime';
initRuntime();

import type { ChatRequest, FilePreviewRequestQuery } from '@tw/shared-types';
import { apiConfig, getExpressApp } from '@tw/utils/module/express';
import { logger } from '@tw/utils/module/logger';
import {
  createEndpoint,
  debugLogsWithDataMw,
  sseEndpoint,
  type WithBody,
  type WithParams,
  type WithQuery,
  type WithShopIdFromHeader,
  type WithUser,
} from '@tw/utils/module/api/endpoint';
import { initializeAiConversationsDB } from './db';
import { validateStreamRequestMiddleware } from './middlewares/streamValidation';
import { chatEndpoint } from './endpoints/chat';
import { cancelTaskEndpoint } from './endpoints/cancelTask';
import { getSessionsRouter } from './endpoints/sessions';
import { streamEndpoint, type StreamChatEventsRequest } from './endpoints/stream';
import { filePreviewEndpoint } from './endpoints/filePreview';
import { initializeFirebaseApp } from '@tw/utils/module/initializeFirebaseApp';
import admin from 'firebase-admin';

function getApp() {
  const { app, router } = getExpressApp({ autoOpenApi: true });

  router.use('/sessions', getSessionsRouter());

  router.post(
    '/chat',
    debugLogsWithDataMw('debug'),
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
    createEndpoint<WithUser & WithShopIdFromHeader & WithBody<ChatRequest>>(chatEndpoint),
  );

  router.post(
    '/tasks/cancel/:taskId',
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
    createEndpoint<
      WithUser &
        WithShopIdFromHeader &
        WithParams<{ taskId: string }> &
        WithBody<{ mode?: 'immediate' | 'after_turn' }>
    >(cancelTaskEndpoint),
  );

  router.get(
    '/stream/:taskId',
    apiConfig({
      openApi: {
        interfaces: ['client'],
        security: { firebase: [] },
        deployment: 'moby-stream',
      },
      auth: {
        serviceId: 'shopify',
        accountIds: (req) => req.headers['x-tw-shop-id'] ?? '',
      },
    }),
    validateStreamRequestMiddleware,
    sseEndpoint<WithQuery<StreamChatEventsRequest>, any>(streamEndpoint),
  );

  router.get(
    '/files/preview',
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
    createEndpoint<WithUser & WithShopIdFromHeader & WithQuery<FilePreviewRequestQuery>>(
      filePreviewEndpoint,
    ),
  );

  app.use(router);

  return app;
}

async function connectToPostgres() {
  logger.debug('Initializing PostgreSQL database connection');
  try {
    await initializeAiConversationsDB();
  } catch (err) {
    logger.error({ err }, 'Failed to initialize PostgreSQL database');
    throw err;
  }
}

async function startServer() {
  const app = getApp();
  await connectToPostgres();
  app.listen();
}

if (require.main === module) {
  initializeFirebaseApp(admin);
  startServer();
}

export const _test = { getApp };
