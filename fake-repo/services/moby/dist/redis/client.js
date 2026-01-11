"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getClient = getClient;
const redisClient_1 = require("@tw/utils/module/redisClient");
const secrets_1 = require("@tw/utils/module/secrets");
let redisClientInstance = null;
async function getClient() {
    if (!redisClientInstance) {
        const redisHost = (0, secrets_1.getSecret)('REDIS_HOST') || 'localhost';
        redisClientInstance = (0, redisClient_1.getRedisClient)(redisHost, {
            singleClient: true,
            name: 'moby-redis-client',
            forceCloud: true,
        });
    }
    if (!redisClientInstance.isOpen) {
        await redisClientInstance.connect();
    }
    return redisClientInstance;
}
//# sourceMappingURL=client.js.map