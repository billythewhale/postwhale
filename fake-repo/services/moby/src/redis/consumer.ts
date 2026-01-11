import { logger } from '@tw/utils/module/logger';
import { getClient } from './client';
import type { RedisStreamEventMessage } from '../helpers/types';
import { decode } from '@msgpack/msgpack';
import { MobyStreamEvent } from '../events';

type StreamSubscriberContext = {
  signal: AbortSignal;
};

export async function getStreamSubscriber(taskId: string, lastId?: string) {
  const streamKey = getStreamKeyForChat(taskId);
  const streamId = lastId || '0-0';

  return async function* subscribeToStream(
    ctx: StreamSubscriberContext,
  ): AsyncGenerator<RedisStreamEventMessage> {
    const baseRedis = await getClient();
    const redis = baseRedis.duplicate();
    const onError = (err: unknown) => {
      logger.error({ err, taskId }, 'Redis stream subscriber error');
    };
    redis.on('error', onError);

    try {
      if (!redis.isOpen) {
        await redis.connect();
      }

      let currentId = streamId;
      while (!ctx.signal.aborted) {
        let response: Awaited<ReturnType<typeof redis.xRead>>;
        try {
          response = await redis.xRead(
            redis.commandOptions({ returnBuffers: true }),
            [{ key: streamKey, id: currentId }],
            { BLOCK: 30_000, COUNT: 100 },
          );
        } catch (err) {
          if (ctx.signal.aborted) {
            break;
          }
          if (!redis.isOpen) {
            break;
          }
          throw err;
        }

        // Yield tick on BLOCK timeout - allows heartbeat checks when Python is silent
        if (!response) {
          yield { type: 'tick' };
          continue;
        }

        if (ctx.signal.aborted) {
          break;
        }

        const messages = response[0]?.messages ?? [];
        if (messages.length === 0) {
          yield { type: 'tick' };
          continue;
        }

        for (const { id, message } of messages) {
          currentId = id.toString();
          if (ctx.signal.aborted) {
            break;
          }

          const decodedEvent = decodeStreamEvent(message.event);
          yield { type: 'data', id: currentId, data: decodedEvent };
        }
      }
    } finally {
      redis.removeListener('error', onError);
      if (redis.isOpen) {
        try {
          await redis.quit();
        } catch (err) {
          logger.error({ err, taskId }, 'Failed to quit Redis stream subscriber');
        }
      }
    }
  };
}

function getStreamKeyForChat(taskId: string): string {
  return `${taskId}`;
}

function decodeStreamEvent(raw: Buffer): MobyStreamEvent {
  const payload = decode(raw);
  return payload as MobyStreamEvent;
}
