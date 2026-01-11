"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getChildSessionIds = getChildSessionIds;
exports.getSessionMetadata = getSessionMetadata;
exports.getSessionMessages = getSessionMessages;
exports.getSessionStructure = getSessionStructure;
exports.getSessionMessagesByBranch = getSessionMessagesByBranch;
exports.getAllSessionData = getAllSessionData;
exports.getSessionsByShopIdPaginated = getSessionsByShopIdPaginated;
exports.getSessionsCountByShopId = getSessionsCountByShopId;
const db_1 = require("./db");
const logger_1 = require("@tw/utils/module/logger");
const util_1 = require("./util");
const logger = (0, logger_1.getLogger)();
/**
 * Get child session IDs for a parent session
 * Optionally filters by shop_id for defense-in-depth tenant isolation
 */
async function getChildSessionIds(parentSessionId, shopId) {
    try {
        const db = (0, db_1.getDb)();
        let query = db
            .selectFrom('agent_sessions')
            .select('session_id')
            .where('parent_session_id', '=', parentSessionId);
        if (shopId) {
            query = query.where('shop_id', '=', shopId);
        }
        const rows = await query.execute();
        return rows.map((row) => row.session_id);
    }
    catch (error) {
        logger.error({ error, parentSessionId, shopId }, 'Failed to get child session IDs');
        throw error;
    }
}
/**
 * Get session metadata and verify ownership
 */
async function getSessionMetadata(sessionId) {
    try {
        const db = (0, db_1.getDb)();
        const row = await db
            .selectFrom('agent_sessions')
            .selectAll()
            .where('session_id', '=', sessionId)
            .executeTakeFirst();
        return row ? (0, util_1.camelizeObj)(row) : undefined;
    }
    catch (error) {
        logger.error({ error, sessionId }, 'Failed to get session metadata');
        throw error;
    }
}
/**
 * Get all messages for a session and its child sessions
 */
async function getSessionMessages(sessionId, shopId) {
    try {
        const db = (0, db_1.getDb)();
        const childSessionIds = await getChildSessionIds(sessionId, shopId);
        const allSessionIds = [sessionId, ...childSessionIds];
        const rows = await db
            .selectFrom('agent_messages')
            .selectAll()
            .where('session_id', 'in', allSessionIds)
            .orderBy('created_at')
            .orderBy('id')
            .execute();
        return rows.map((row) => (0, util_1.camelizeObj)(row));
    }
    catch (error) {
        logger.error({ error, sessionId }, 'Failed to get session messages');
        throw error;
    }
}
/**
 * Get message structure for a session and its child sessions (with all branch info)
 */
async function getSessionStructure(sessionId, shopId) {
    try {
        const db = (0, db_1.getDb)();
        const childSessionIds = await getChildSessionIds(sessionId, shopId);
        const allSessionIds = [sessionId, ...childSessionIds];
        const rows = await db
            .selectFrom('message_structure')
            .selectAll()
            .where('session_id', 'in', allSessionIds)
            .orderBy('branch_id')
            .orderBy('sequence_number')
            .execute();
        return rows.map((row) => (0, util_1.camelizeObj)(row));
    }
    catch (error) {
        logger.error({ error, sessionId }, 'Failed to get session structure');
        throw error;
    }
}
/**
 * Get messages for a session and its child sessions filtered by branch
 */
async function getSessionMessagesByBranch(sessionId, branchId, shopId) {
    try {
        const db = (0, db_1.getDb)();
        const childSessionIds = await getChildSessionIds(sessionId, shopId);
        const allSessionIds = [sessionId, ...childSessionIds];
        const messages = await db
            .selectFrom('agent_messages as am')
            .innerJoin('message_structure as ms', 'am.id', 'ms.message_id')
            .select(['am.id', 'am.session_id', 'am.message_data', 'am.created_at', 'ms.message_type'])
            .where('am.session_id', 'in', allSessionIds)
            .where('ms.branch_id', '=', branchId)
            .orderBy('ms.sequence_number')
            .execute();
        return messages.map((row) => (0, util_1.camelizeObj)(row));
    }
    catch (error) {
        logger.error({ error, sessionId, branchId }, 'Failed to get session messages by branch');
        throw error;
    }
}
/**
 * Get all session data in parallel for efficiency
 */
async function getAllSessionData(sessionId, shopId) {
    try {
        const [metadata, messages, structure] = await Promise.all([
            getSessionMetadata(sessionId),
            getSessionMessages(sessionId, shopId),
            getSessionStructure(sessionId, shopId),
        ]);
        return { metadata, messages, structure };
    }
    catch (error) {
        logger.error({ error, sessionId }, 'Failed to get all session data');
        throw error;
    }
}
/**
 * Get sessions by shop_id with pagination
 */
async function getSessionsByShopIdPaginated(shopId, page = 1, limit = 20) {
    try {
        const db = (0, db_1.getDb)();
        const offset = (page - 1) * limit;
        const results = await db
            .selectFrom('agent_sessions')
            .selectAll()
            .where('shop_id', '=', shopId)
            .where('agent_type', '=', 'master')
            .orderBy('created_at', 'desc')
            .limit(limit)
            .offset(offset)
            .execute();
        logger.debug('Fetched paginated sessions', {
            shopId,
            page,
            limit,
            resultCount: results.length,
        });
        return results.map((row) => (0, util_1.camelizeObj)(row));
    }
    catch (error) {
        logger.error({ error, shopId, page, limit }, 'Failed to get paginated sessions by shop_id');
        throw error;
    }
}
/**
 * Get count of sessions by shop_id
 */
async function getSessionsCountByShopId(shopId) {
    try {
        const db = (0, db_1.getDb)();
        const result = await db
            .selectFrom('agent_sessions')
            .select(({ fn }) => [fn.count('session_id').as('count')])
            .where('shop_id', '=', shopId)
            .where('agent_type', '=', 'master')
            .executeTakeFirstOrThrow();
        const count = Number(result.count);
        logger.debug('Counted sessions for shop', {
            shopId,
            count,
        });
        return count;
    }
    catch (error) {
        logger.error({ error, shopId }, 'Failed to count sessions by shop_id');
        throw error;
    }
}
//# sourceMappingURL=queries.js.map