import type { Request, Response, NextFunction } from 'express';
import { formatRedisStreamId } from '../helpers/redisStreamHelpers';
import { logger } from '@tw/utils/module/logger';

/**
 * Express middleware to validate stream request parameters
 * Returns 400 Bad Request if lastId format is invalid
 * Formats the lastId in place for the endpoint to use
 */
export function validateStreamRequestMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  try {
    const taskId = req.params.taskId;
    const lastId = req.query.lastId as string | undefined;

    if (lastId) {
      const formattedLastId = formatRedisStreamId(lastId);
      req.query.lastId = formattedLastId;
      logger.debug(
        {
          taskId,
          rawLastId: lastId,
          formattedLastId,
        },
        'Validated and formatted Redis Stream ID',
      );
    }

    next();
  } catch (error) {
    logger.error(
      {
        error: (error as Error).message,
        query: req.query,
        taskId: req.params.taskId,
      },
      'Invalid stream request',
    );
    res.status(400).json({ error: (error as Error).message });
  }
}
