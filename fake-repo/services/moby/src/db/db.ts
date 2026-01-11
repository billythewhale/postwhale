import { getSecret } from '@tw/utils/module/secrets';
import { Kysely, PostgresDialect } from 'kysely';
import { Pool, types } from 'pg';
import { getLogger } from '@tw/utils/module/logger';
import type { ChatSessionsDb } from './types';

const logger = getLogger();

types.setTypeParser(types.builtins.TIMESTAMP, (val) => {
  return val === null ? null : new Date(val + 'Z');
});

let aiConversationsPool: Pool | null = null;
let aiConversationsDb: Kysely<ChatSessionsDb>;

export const getDb = (): Kysely<ChatSessionsDb> => {
  if (!aiConversationsDb) {
    throw new Error('AI Conversations database not initialized');
  }
  return aiConversationsDb;
};

export async function initializeAiConversationsDB(): Promise<void> {
  try {
    const connectionString = getSecret('CHAT_SESSIONS_PG_URI');

    aiConversationsPool = new Pool({
      connectionString: connectionString,
      max: 20,
      connectionTimeoutMillis: 60000,
      idleTimeoutMillis: 60000,
    });

    aiConversationsPool.on('error', (err) => {
      logger.error('Unexpected error on idle PostgreSQL client', err);
    });

    aiConversationsDb = new Kysely<ChatSessionsDb>({
      dialect: new PostgresDialect({
        pool: aiConversationsPool,
      }),
    });

    logger.info('AI Conversations database initialized');
  } catch (error) {
    logger.error({ error }, 'Failed to initialize AI Conversations database');
    throw error;
  }
}
