"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.streamEndpoint = streamEndpoint;
const consumer_1 = require("../redis/consumer");
const logger_1 = require("@tw/utils/module/logger");
const events_1 = require("../events");
const heartbeat_1 = require("../utils/heartbeat");
async function matchEvent(event, streamConfig) {
    if (!event ||
        typeof event !== 'object' ||
        !('type' in event) ||
        typeof event.type !== 'string') {
        logger_1.logger.warn({ event }, 'Received event with unexpected structure');
        return null;
    }
    const typedEvent = event;
    const result = await (0, events_1.handleEvent)(typedEvent, streamConfig);
    if (result) {
        return {
            shouldSend: result.shouldSend,
            transformedEvent: result.transformedEvent ?? typedEvent,
        };
    }
    return { shouldSend: false };
}
async function* streamEndpoint(arg, ctx) {
    const { taskId, lastId, workingDir } = arg;
    const streamConfig = { workingDir };
    logger_1.logger.debug({ taskId, lastId }, 'Starting SSE stream for chat events');
    const stream = await (0, consumer_1.getStreamSubscriber)(taskId, lastId);
    const streamIterator = stream(ctx);
    logger_1.logger.debug({ stream }, 'Stream subscriber created');
    const shouldCloseStream = createShouldCloseStream();
    const heartbeat = (0, heartbeat_1.createHeartbeatManager)(taskId);
    try {
        for await (const redisEvent of streamIterator) {
            const { events, shouldClose } = heartbeat.check();
            yield* events;
            if (shouldClose)
                break;
            // Tick events just trigger heartbeat checks, no data to process
            if (redisEvent.type === 'tick')
                continue;
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
                };
                if (shouldCloseStream(transformedEvent)) {
                    logger_1.logger.debug({ taskId }, 'SSE stream for chat events should close');
                    break;
                }
            }
        }
    }
    catch (error) {
        logger_1.logger.error({ taskId, err: error }, 'Error in SSE stream for chat events');
        throw error;
    }
}
function createShouldCloseStream() {
    let started = false;
    return (event) => {
        if (event.type !== 'turnStatus')
            return false;
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
//# sourceMappingURL=stream.js.map