import { initRuntime } from '@tw/utils/module/runtime';
initRuntime();

import { getExpressApp } from '@tw/utils/module/express';
import { customRouter } from './custom';
import { logger } from '@tw/utils/module/logger';

async function startServer() {
  const { app, router } = getExpressApp({ autoOpenApi: true });
  router.post('/q-call', async (req, res) => {
    logger.info({ body: req.body }, 'q-call');
    res.json({ success: true });
  });

  app.use(customRouter);

  app.use(router);
  app.listen(process.env.PORT);
}

if (require.main === module) {
  startServer();
}
