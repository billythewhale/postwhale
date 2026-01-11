"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getStreamSubscriber = getStreamSubscriber;
const logger_1 = require("@tw/utils/module/logger");
const client_1 = require("./client");
const msgpack_1 = require("@msgpack/msgpack");
async function getStreamSubscriber(taskId, lastId) {
    const streamKey = getStreamKeyForChat(taskId);
    const streamId = lastId || '0-0';
    return async function* subscribeToStream(ctx) {
        const baseRedis = await (0, client_1.getClient)();
        const redis = baseRedis.duplicate();
        const onError = (err) => {
            logger_1.logger.error({ err, taskId }, 'Redis stream subscriber error');
        };
        redis.on('error', onError);
        try {
            if (!redis.isOpen) {
                await redis.connect();
            }
            let currentId = streamId;
            while (!ctx.signal.aborted) {
                let response;
                try {
                    response = await redis.xRead(redis.commandOptions({ returnBuffers: true }), [{ key: streamKey, id: currentId }], { BLOCK: 30_000, COUNT: 100 });
                }
                catch (err) {
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
        }
        finally {
            redis.removeListener('error', onError);
            if (redis.isOpen) {
                try {
                    await redis.quit();
                }
                catch (err) {
                    logger_1.logger.error({ err, taskId }, 'Failed to quit Redis stream subscriber');
                }
            }
        }
    };
}
function getStreamKeyForChat(taskId) {
    return `${taskId}`;
}
function decodeStreamEvent(raw) {
    const payload = (0, msgpack_1.decode)(raw);
    return payload;
}
//# sourceMappingURL=consumer.js.map