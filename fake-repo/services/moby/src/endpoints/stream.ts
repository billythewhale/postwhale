import type { SSEHandlerContext, SSEMessage } from '@tw/utils/module/api/endpoint';
import { getStreamSubscriber } from '../redis/consumer';
import { logger } from '@tw/utils/module/logger';
import { type MobyStreamEvent, handleEvent } from '../events';
import type { StreamConfig } from '../events/types';
import type { Moby } from '@tw/shared-types';
import { createHeartbeatManager } from '../utils/heartbeat';

export type StreamChatEventsRequest = {
  taskId: string;
  workingDir: string;
  lastId?: string;
};

async function matchEvent(event: unknown, streamConfig: StreamConfig) {
  if (
    !event ||
    typeof event !== 'object' ||
    !('type' in event) ||
    typeof (event as any).type !== 'string'
  ) {
    logger.warn({ event }, 'Received event with unexpected structure');
    return null;
  }

  const typedEvent = event as MobyStreamEvent;

  const result = await handleEvent(typedEvent, streamConfig);

  if (result) {
    return {
      shouldSend: result.shouldSend,
      transformedEvent: result.transformedEvent ?? typedEvent,
    };
  }

  return { shouldSend: false };
}

export async function* streamEndpoint(arg: StreamChatEventsRequest, ctx: SSEHandlerContext) {
  const { taskId, lastId, workingDir } = arg;
  const streamConfig: StreamConfig = { workingDir };

  logger.debug({ taskId, lastId }, 'Starting SSE stream for chat events');
  const stream = await getStreamSubscriber(taskId, lastId);
  const streamIterator = stream(ctx);
  logger.debug({ stream }, 'Stream subscriber created');

  const shouldCloseStream = createShouldCloseStream();
  const heartbeat = createHeartbeatManager(taskId);

  try {
    for await (const redisEvent of streamIterator) {
      const { events, shouldClose } = heartbeat.check();
      yield* events;
      if (shouldClose) break;

      // Tick events just trigger heartbeat checks, no data to process
      if (redisEvent.type === 'tick') continue;

      // Data event means Python is alive
      heartbeat.onPythonActivity();

      const result = await matchEvent(redisEvent.data, streamConfig);
      if (!result) {
        continue;
      }

      const { shouldSend, transformedEvent } = result;

      if (shouldSend) {
        yield {
          event: transformedEvent.type,
          data: transformedEvent,
          id: redisEvent.id,
        } as SSEMessage<MobyStreamEvent>;

        if (shouldCloseStream(transformedEvent)) {
          logger.debug({ taskId }, 'SSE stream for chat events should close');
          break;
        }
      }
    }
  } catch (error) {
    logger.error({ taskId, err: error }, 'Error in SSE stream for chat events');
    throw error;
  }
}

function createShouldCloseStream() {
  let started = false;

  return (event: Moby.TurnStatusEvent | any): boolean => {
    if (event.type !== 'turnStatus') return false;

    if (event.status === 'started') {
      started = true;
      return false;
    }
    if (event.status === 'completed' && started) {
      return true;
    }
    return false;
  };
}
