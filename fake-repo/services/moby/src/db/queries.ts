import { getDb } from './db';
import { getLogger } from '@tw/utils/module/logger';
import type { AgentSession, AgentMessage, MessageStructure } from './types';
import { camelizeObj } from './util';

const logger = getLogger();

/**
 * Get child session IDs for a parent session
 * Optionally filters by shop_id for defense-in-depth tenant isolation
 */
export async function getChildSessionIds(
  parentSessionId: string,
  shopId?: string,
): Promise<string[]> {
  try {
    const db = getDb();
    let query = db
      .selectFrom('agent_sessions')
      .select('session_id')
      .where('parent_session_id', '=', parentSessionId);

    if (shopId) {
      query = query.where('shop_id', '=', shopId);
    }

    const rows = await query.execute();
    return rows.map((row) => row.session_id);
  } catch (error) {
    logger.error({ error, parentSessionId, shopId }, 'Failed to get child session IDs');
    throw error;
  }
}

/**
 * Get session metadata and verify ownership
 */
export async function getSessionMetadata(sessionId: string): Promise<AgentSession | undefined> {
  try {
    const db = getDb();
    const row = await db
      .selectFrom('agent_sessions')
      .selectAll()
      .where('session_id', '=', sessionId)
      .executeTakeFirst();
    return row ? camelizeObj(row) : undefined;
  } catch (error) {
    logger.error({ error, sessionId }, 'Failed to get session metadata');
    throw error;
  }
}

/**
 * Get all messages for a session and its child sessions
 */
export async function getSessionMessages(
  sessionId: string,
  shopId?: string,
): Promise<AgentMessage[]> {
  try {
    const db = getDb();

    const childSessionIds = await getChildSessionIds(sessionId, shopId);
    const allSessionIds = [sessionId, ...childSessionIds];

    const rows = await db
      .selectFrom('agent_messages')
      .selectAll()
      .where('session_id', 'in', allSessionIds)
      .orderBy('created_at')
      .orderBy('id')
      .execute();
    return rows.map((row) => camelizeObj(row));
  } catch (error) {
    logger.error({ error, sessionId }, 'Failed to get session messages');
    throw error;
  }
}

/**
 * Get message structure for a session and its child sessions (with all branch info)
 */
export async function getSessionStructure(
  sessionId: string,
  shopId?: string,
): Promise<MessageStructure[]> {
  try {
    const db = getDb();

    const childSessionIds = await getChildSessionIds(sessionId, shopId);
    const allSessionIds = [sessionId, ...childSessionIds];

    const rows = await db
      .selectFrom('message_structure')
      .selectAll()
      .where('session_id', 'in', allSessionIds)
      .orderBy('branch_id')
      .orderBy('sequence_number')
      .execute();
    return rows.map((row) => camelizeObj(row));
  } catch (error) {
    logger.error({ error, sessionId }, 'Failed to get session structure');
    throw error;
  }
}

/**
 * Get messages for a session and its child sessions filtered by branch
 */
export async function getSessionMessagesByBranch(
  sessionId: string,
  branchId: string,
  shopId?: string,
): Promise<Omit<AgentMessage, 'updatedAt'>[]> {
  try {
    const db = getDb();

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

    return messages.map((row) => camelizeObj(row));
  } catch (error) {
    logger.error({ error, sessionId, branchId }, 'Failed to get session messages by branch');
    throw error;
  }
}

/**
 * Get all session data in parallel for efficiency
 */
export async function getAllSessionData(
  sessionId: string,
  shopId?: string,
): Promise<{
  metadata: AgentSession | undefined;
  messages: AgentMessage[];
  structure: MessageStructure[];
}> {
  try {
    const [metadata, messages, structure] = await Promise.all([
      getSessionMetadata(sessionId),
      getSessionMessages(sessionId, shopId),
      getSessionStructure(sessionId, shopId),
    ]);

    return { metadata, messages, structure };
  } catch (error) {
    logger.error({ error, sessionId }, 'Failed to get all session data');
    throw error;
  }
}

/**
 * Get sessions by shop_id with pagination
 */
export async function getSessionsByShopIdPaginated(
  shopId: string,
  page: number = 1,
  limit: number = 20,
) {
  try {
    const db = getDb();
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

    return results.map((row) => camelizeObj(row) as AgentSession);
  } catch (error) {
    logger.error({ error, shopId, page, limit }, 'Failed to get paginated sessions by shop_id');
    throw error;
  }
}

/**
 * Get count of sessions by shop_id
 */
export async function getSessionsCountByShopId(shopId: string) {
  try {
    const db = getDb();
    const result = await db
      .selectFrom('agent_sessions')
      .select(({ fn }) => [fn.count<number>('session_id').as('count')])
      .where('shop_id', '=', shopId)
      .where('agent_type', '=', 'master')
      .executeTakeFirstOrThrow();

    const count = Number(result.count);

    logger.debug('Counted sessions for shop', {
      shopId,
      count,
    });

    return count;
  } catch (error) {
    logger.error({ error, shopId }, 'Failed to count sessions by shop_id');
    throw error;
  }
}
