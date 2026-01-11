import type { Kysely } from 'kysely';
import type {
  AgentMessageRow,
  AgentSessionRow,
  ChatSessionsDb,
  MessageStructureRow,
  TurnUsageRow,
} from '../types';
import { snakifyObj } from '../util';

export type TestData = {
  sessions: Partial<AgentSessionRow>[];
  messages: Partial<AgentMessageRow>[];
  messageStructure: Partial<MessageStructureRow>[];
  turnUsage: Partial<TurnUsageRow>[];
};

const createEmptyTestData = (): TestData => ({
  sessions: [],
  messages: [],
  messageStructure: [],
  turnUsage: [],
});

function createMockQueryBuilder(tableName: string, getTestData: () => TestData) {
  const state: {
    filters: Record<string, any>;
    orderBy: Array<{ column: string; direction: 'asc' | 'desc' }>;
    limitVal: number | null;
    offsetVal: number;
    isSelectAll: boolean;
    selectCols: string[] | null;
    isJoin: boolean;
    joinTable: string | null;
  } = {
    filters: {},
    orderBy: [],
    limitVal: null,
    offsetVal: 0,
    isSelectAll: false,
    selectCols: null,
    isJoin: false,
    joinTable: null,
  };

  const builder: any = {
    select: jest.fn((...columns: any[]) => {
      if (columns.length > 0 && Array.isArray(columns[0])) {
        state.selectCols = columns[0];
      } else {
        state.selectCols = columns;
      }
      return builder;
    }),
    selectAll: jest.fn(() => {
      state.isSelectAll = true;
      return builder;
    }),
    distinct: jest.fn(() => builder),
    where: jest.fn((column: any, op: any, value: any) => {
      if (op === '=') {
        state.filters[column] = value;
      } else if (op === 'in') {
        state.filters[column] = value;
      }
      return builder;
    }),
    innerJoin: jest.fn((joinTable: any) => {
      state.isJoin = true;
      state.joinTable = joinTable;
      return builder;
    }),
    orderBy: jest.fn((column: any, direction?: 'asc' | 'desc') => {
      state.orderBy.push({ column, direction: direction || 'asc' });
      return builder;
    }),
    limit: jest.fn((n: number) => {
      state.limitVal = n;
      return builder;
    }),
    offset: jest.fn((n: number) => {
      state.offsetVal = n;
      return builder;
    }),
    execute: jest.fn(async () => {
      const testData = getTestData();
      const table = tableName.split(' as ')[0] as keyof ChatSessionsDb;

      if (table === 'agent_sessions') {
        let results = [...testData.sessions];

        if (state.filters.session_id) {
          if (Array.isArray(state.filters.session_id)) {
            results = results.filter((r) => state.filters.session_id.includes(r.session_id));
          } else {
            results = results.filter((r) => r.session_id === state.filters.session_id);
          }
        }
        if (state.filters.shop_id) {
          results = results.filter((r) => r.shop_id === state.filters.shop_id);
        }
        if (state.filters.agent_type) {
          results = results.filter((r) => r.agent_type === state.filters.agent_type);
        }
        if (state.filters.parent_session_id) {
          results = results.filter((r) => r.parent_session_id === state.filters.parent_session_id);
        }

        if (state.orderBy.length > 0) {
          results.sort((a, b) => {
            for (const order of state.orderBy) {
              const col = order.column;
              const aVal = (a as any)[col]?.getTime?.() || (a as any)[col] || 0;
              const bVal = (b as any)[col]?.getTime?.() || (b as any)[col] || 0;
              if (aVal !== bVal) {
                if (typeof aVal === 'string' || typeof bVal === 'string') {
                  const comparison = String(aVal ?? '').localeCompare(String(bVal ?? ''));
                  return order.direction === 'desc' ? -comparison : comparison;
                }
                return order.direction === 'desc' ? bVal - aVal : aVal - bVal;
              }
            }
            return 0;
          });
        }

        if (state.limitVal !== null) {
          results = results.slice(state.offsetVal, state.offsetVal + state.limitVal);
        }

        if (state.selectCols && !state.isSelectAll) {
          const selectFields = state.selectCols.map((col: string) => {
            const fieldName = col.split('.').pop() || col;
            return fieldName;
          });

          if (selectFields.length === 1 && selectFields[0] === 'session_id') {
            return results.map((r) => ({ session_id: r.session_id }));
          }
        }

        return results;
      }

      if (table === 'agent_messages' || state.isJoin) {
        let messages = [...testData.messages];
        let structure = [...testData.messageStructure];

        const sessionIdKey = Object.keys(state.filters).find((k) => k.includes('session_id'));
        if (sessionIdKey) {
          const sessionIds = state.filters[sessionIdKey];
          if (Array.isArray(sessionIds)) {
            messages = messages.filter((m) => sessionIds.includes(m.session_id));
          } else {
            messages = messages.filter((m) => m.session_id === sessionIds);
          }
        }

        const branchIdKey = Object.keys(state.filters).find((k) => k.includes('branch_id'));
        if (branchIdKey) {
          const branchId = state.filters[branchIdKey];
          const messageIds = structure
            .filter((s) => s.branch_id === branchId)
            .map((s) => s.message_id);
          messages = messages.filter((m) => messageIds.includes(m.id));
        }

        if (state.orderBy.length > 0) {
          messages.sort((a, b) => {
            for (const order of state.orderBy) {
              const col = order.column.replace(/^(am|ms)\./, '');
              const aVal = (a as any)[col]?.getTime?.() || (a as any)[col] || 0;
              const bVal = (b as any)[col]?.getTime?.() || (b as any)[col] || 0;
              if (aVal !== bVal) {
                if (typeof aVal === 'string' || typeof bVal === 'string') {
                  const comparison = String(aVal ?? '').localeCompare(String(bVal ?? ''));
                  return order.direction === 'desc' ? -comparison : comparison;
                }
                return order.direction === 'desc' ? bVal - aVal : aVal - bVal;
              }
            }
            if (state.orderBy.some((o) => o.column.includes('id'))) {
              const aId = a.id;
              const bId = b.id;
              if (aId !== bId) {
                return aId?.localeCompare(bId ?? '') || 0;
              }
            }
            return 0;
          });
        }

        if (state.isJoin) {
          return messages.map((m) => {
            const structEntry = structure.find((s) => s.message_id === m.id);
            return {
              id: m.id,
              session_id: m.session_id,
              message_data: m.message_data,
              message_type: structEntry?.message_type ?? m.message_type,
              created_at: m.created_at,
            };
          });
        }

        return messages;
      }

      return [];
    }),
    executeTakeFirst: jest.fn(async () => {
      const results = await builder.execute();
      return results[0] || undefined;
    }),
    executeTakeFirstOrThrow: jest.fn(async () => {
      const testData = getTestData();
      if (tableName.includes('agent_sessions')) {
        let results = [...testData.sessions];
        if (state.filters.shop_id) {
          results = results.filter((r) => r.shop_id === state.filters.shop_id);
        }
        if (state.filters.agent_type) {
          results = results.filter((r) => r.agent_type === state.filters.agent_type);
        }
        return { count: results.length };
      }
      throw new Error('Not found');
    }),
  };

  return builder;
}

export function createMockKysely(): Kysely<ChatSessionsDb> & {
  setData: (data: Partial<TestData>) => void;
  reset: () => void;
} {
  let testData = createEmptyTestData();

  const mockDb: any = {
    selectFrom: jest.fn((table: string | keyof ChatSessionsDb) => {
      return createMockQueryBuilder(table as string, () => testData);
    }),
  };

  mockDb.setData = (data: Partial<TestData>) => {
    if (data.sessions !== undefined) {
      testData.sessions = data.sessions.map(
        (s) => snakifyObj(s as any) as Partial<AgentSessionRow>,
      );
    }
    if (data.messages !== undefined) {
      testData.messages = data.messages.map(
        (m) => snakifyObj(m as any) as Partial<AgentMessageRow>,
      );
    }
    if (data.messageStructure !== undefined) {
      testData.messageStructure = data.messageStructure.map(
        (ms) => snakifyObj(ms as any) as Partial<MessageStructureRow>,
      );
    }
    if (data.turnUsage !== undefined) {
      testData.turnUsage = data.turnUsage.map(
        (tu) => snakifyObj(tu as any) as Partial<TurnUsageRow>,
      );
    }
  };

  mockDb.reset = () => {
    testData = createEmptyTestData();
    mockDb.selectFrom.mockClear?.();
  };

  return mockDb;
}

export type MockKysely = ReturnType<typeof createMockKysely>;
