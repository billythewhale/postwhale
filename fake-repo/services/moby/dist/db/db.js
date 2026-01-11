"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDb = void 0;
exports.initializeAiConversationsDB = initializeAiConversationsDB;
const secrets_1 = require("@tw/utils/module/secrets");
const kysely_1 = require("kysely");
const pg_1 = require("pg");
const logger_1 = require("@tw/utils/module/logger");
const logger = (0, logger_1.getLogger)();
pg_1.types.setTypeParser(pg_1.types.builtins.TIMESTAMP, (val) => {
    return val === null ? null : new Date(val + 'Z');
});
let aiConversationsPool = null;
let aiConversationsDb;
const getDb = () => {
    if (!aiConversationsDb) {
        throw new Error('AI Conversations database not initialized');
    }
    return aiConversationsDb;
};
exports.getDb = getDb;
async function initializeAiConversationsDB() {
    try {
        const connectionString = (0, secrets_1.getSecret)('CHAT_SESSIONS_PG_URI');
        aiConversationsPool = new pg_1.Pool({
            connectionString: connectionString,
            max: 20,
            connectionTimeoutMillis: 60000,
            idleTimeoutMillis: 60000,
        });
        aiConversationsPool.on('error', (err) => {
            logger.error('Unexpected error on idle PostgreSQL client', err);
        });
        aiConversationsDb = new kysely_1.Kysely({
            dialect: new kysely_1.PostgresDialect({
                pool: aiConversationsPool,
            }),
        });
        logger.info('AI Conversations database initialized');
    }
    catch (error) {
        logger.error({ error }, 'Failed to initialize AI Conversations database');
        throw error;
    }
}
//# sourceMappingURL=db.js.map