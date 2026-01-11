import { testRouter } from '@tw/test-utils/module/api';
import { getSessionsRouter } from './index';
import { createMockKysely } from '../../db/__test__/mockKysely';
import type { AgentSession, AgentMessage } from '../../db/types';

jest.mock('../../db/db', () => ({
  getDb: jest.fn(),
  initializeAiConversationsDB: jest.fn(),
}));

import { getDb } from '../../db/db';
const db = createMockKysely();
(getDb as any).mockImplementation(() => db);

beforeEach(() => {
  db.reset();
  jest.clearAllMocks();
});

describe('GET /branch', () => {
  const TEST_SHOP_ID = 'test-shop.myshopify.com';
  const TEST_SESSION_ID = 'session-123';

  let api: ReturnType<typeof testRouter>;

  beforeEach(() => {
    api = testRouter(getSessionsRouter());
  });

  const createMockSession = (overrides: Partial<AgentSession> = {}): AgentSession => ({
    sessionId: TEST_SESSION_ID,
    shopId: TEST_SHOP_ID,
    userId: 'user-1',
    currentBranchId: 'main',
    title: 'Test Session',
    agentType: 'master',
    parentSessionId: null,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    ...overrides,
  });

  type MockMessageArg = Omit<Partial<AgentMessage>, 'messageData'> & {
    messageData?: Record<string, any>;
  };
  const createMockMessage = (overrides: MockMessageArg = {}): AgentMessage => {
    const { messageData, ...rest } = overrides;
    return {
      id: 'msg-1',
      sessionId: TEST_SESSION_ID,
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01'),
      messageType: 'user',
      messageData: JSON.stringify(messageData ?? { role: 'user', content: 'Default message' }),
      ...rest,
    };
  };

  describe('when no branchId is passed', () => {
    it('should return messages from the current branch (main)', async () => {
      const mockSession = createMockSession({ currentBranchId: 'main' });
      const mockMessages = [
        createMockMessage({
          id: 'msg-1',
          messageData: { role: 'user', content: 'Hello' },
        }),
        createMockMessage({
          id: 'msg-2',
          messageData: { role: 'assistant', content: 'Hi there!' },
        }),
      ];

      db.setData({
        sessions: [mockSession],
        messages: mockMessages,
        messageStructure: [
          {
            id: 'struct-1',
            session_id: TEST_SESSION_ID,
            message_id: 'msg-1',
            branch_id: 'main',
            user_id: 'user-1',
            is_thread: false,
            message_type: 'user',
            sequence_number: 1,
            user_turn_number: 1,
            branch_turn_number: 1,
            created_at: new Date('2024-01-01'),
          },
          {
            id: 'struct-2',
            session_id: TEST_SESSION_ID,
            message_id: 'msg-2',
            branch_id: 'main',
            user_id: 'user-1',
            is_thread: false,
            message_type: 'assistant',
            sequence_number: 2,
            user_turn_number: 1,
            branch_turn_number: 2,
            created_at: new Date('2024-01-01'),
          },
        ],
      });

      const response = await api
        .get('/branch')
        .set('x-tw-shop-id', TEST_SHOP_ID)
        .query({ sessionId: TEST_SESSION_ID })
        .expect(200);

      expect(response.body).toEqual({
        sessionId: TEST_SESSION_ID,
        shopId: TEST_SHOP_ID,
        branchId: 'main',
        turns: [[expect.any(Object), expect.any(Object)]],
        messageCount: 2,
      });
    });
  });

  describe('when branchId is passed', () => {
    it('should return only messages from the specified branch', async () => {
      const mockSession = createMockSession({ currentBranchId: 'main' });
      const branchBMessages = [
        createMockMessage({
          id: 'msg-3',
          messageData: { role: 'user', content: 'Branch B message' },
        }),
      ];

      db.setData({
        sessions: [mockSession],
        messages: branchBMessages,
        messageStructure: [
          {
            id: 'struct-3',
            session_id: TEST_SESSION_ID,
            message_id: 'msg-3',
            branch_id: 'branch-b',
            user_id: 'user-1',
            is_thread: false,
            message_type: 'user',
            sequence_number: 1,
            user_turn_number: 1,
            branch_turn_number: 1,
            created_at: new Date('2024-01-01'),
          },
        ],
      });

      const response = await api
        .get('/branch')
        .set('x-tw-shop-id', TEST_SHOP_ID)
        .query({ sessionId: TEST_SESSION_ID, branchId: 'branch-b' })
        .expect(200);

      expect(response.body).toEqual(
        expect.objectContaining({
          branchId: 'branch-b',
          turns: [
            [
              expect.objectContaining({
                messageData: expect.objectContaining({ role: 'user', content: 'Branch B message' }),
              }),
            ],
          ],
          messageCount: 1,
        }),
      );
    });

    it('should return messages only from the requested branch when multiple branches exist', async () => {
      const mockSession = createMockSession({ currentBranchId: 'main' });
      const messages = [
        {
          id: 'msg-a1',
          messageData: { role: 'user', content: 'Branch A msg 1' },
        },
        {
          id: 'msg-a2',
          messageData: { role: 'assistant', content: 'Branch A response' },
        },
        {
          id: 'msg-b1',
          messageData: { role: 'user', content: 'Branch B msg 1' },
        },
        {
          id: 'msg-main1',
          messageData: { role: 'user', content: 'Main msg' },
        },
      ];
      db.setData({
        sessions: [mockSession],
        messages: messages.map((msg) => createMockMessage(msg)),
        messageStructure: [
          {
            id: 'struct-a1',
            session_id: TEST_SESSION_ID,
            message_id: 'msg-a1',
            branch_id: 'branch-a',
            user_id: 'user-1',
            is_thread: false,
            message_type: 'user',
            sequence_number: 1,
            user_turn_number: 1,
            branch_turn_number: 1,
            created_at: new Date('2024-01-01'),
          },
          {
            id: 'struct-a2',
            session_id: TEST_SESSION_ID,
            message_id: 'msg-a2',
            branch_id: 'branch-a',
            user_id: 'user-1',
            is_thread: false,
            message_type: 'assistant',
            sequence_number: 2,
            user_turn_number: 1,
            branch_turn_number: 2,
            created_at: new Date('2024-01-01'),
          },
          {
            id: 'struct-b1',
            session_id: TEST_SESSION_ID,
            message_id: 'msg-b1',
            branch_id: 'branch-b',
            user_id: 'user-1',
            is_thread: false,
            message_type: 'user',
            sequence_number: 1,
            user_turn_number: 1,
            branch_turn_number: 1,
            created_at: new Date('2024-01-01'),
          },
          {
            id: 'struct-main1',
            session_id: TEST_SESSION_ID,
            message_id: 'msg-main1',
            branch_id: 'main',
            user_id: 'user-1',
            is_thread: false,
            message_type: 'user',
            sequence_number: 1,
            user_turn_number: 1,
            branch_turn_number: 1,
            created_at: new Date('2024-01-01'),
          },
        ],
      });

      const responseA = await api
        .get('/branch')
        .set('x-tw-shop-id', TEST_SHOP_ID)
        .query({ sessionId: TEST_SESSION_ID, branchId: 'branch-a' })
        .expect(200);

      expect(responseA.body).toEqual(
        expect.objectContaining({
          branchId: 'branch-a',
          turns: [
            [
              expect.objectContaining({
                id: messages[0].id,
                messageData: expect.objectContaining(messages[0].messageData),
              }),
              expect.objectContaining({
                id: messages[1].id,
                messageData: expect.objectContaining(messages[1].messageData),
              }),
            ],
          ],
          messageCount: 2,
        }),
      );

      const responseB = await api
        .get('/branch')
        .set('x-tw-shop-id', TEST_SHOP_ID)
        .query({ sessionId: TEST_SESSION_ID, branchId: 'branch-b' })
        .expect(200);

      expect(responseB.body).toEqual(
        expect.objectContaining({
          branchId: 'branch-b',
          turns: [
            [
              expect.objectContaining({
                id: messages[2].id,
                messageData: expect.objectContaining(messages[2].messageData),
              }),
            ],
          ],
        }),
      );
    });
  });

  describe('when session does not exist in the DB', () => {
    it('should return 404 when session metadata is not found', async () => {
      db.setData({
        sessions: [],
        messages: [],
        messageStructure: [],
      });

      await api
        .get('/branch')
        .set('x-tw-shop-id', TEST_SHOP_ID)
        .query({ sessionId: 'non-existent-session' })
        .expect(404);
    });
  });

  describe('when shopId does not match', () => {
    it('should not expose session existence when shopId mismatches', async () => {
      const mockSession = createMockSession({ shopId: 'secret-shop.myshopify.com' });
      db.setData({
        sessions: [mockSession],
        messages: [],
        messageStructure: [],
      });

      const response = await api
        .get('/branch')
        .set('x-tw-shop-id', 'attacker-shop.myshopify.com')
        .query({ sessionId: TEST_SESSION_ID })
        .expect(404);

      // The error message should be generic to avoid revealing session existence
      expect(response.text).toBe('Session not found');
    });
  });

  describe('edge cases', () => {
    it('should handle empty message list gracefully', async () => {
      const mockSession = createMockSession();
      db.setData({
        sessions: [mockSession],
        messages: [],
        messageStructure: [],
      });

      const response = await api
        .get('/branch')
        .set('x-tw-shop-id', TEST_SHOP_ID)
        .query({ sessionId: TEST_SESSION_ID })
        .expect(200);

      expect(response.body).toEqual({
        sessionId: TEST_SESSION_ID,
        shopId: TEST_SHOP_ID,
        branchId: 'main',
        turns: [],
        messageCount: 0,
      });
    });

    it('should parse messageData JSON correctly', async () => {
      const mockSession = createMockSession();
      const messageContent = { role: 'user', content: 'Test message', metadata: { key: 'value' } };
      const mockMessages = [createMockMessage({ messageData: messageContent })];

      db.setData({
        sessions: [mockSession],
        messages: mockMessages,
        messageStructure: [
          {
            id: 'struct-1',
            session_id: TEST_SESSION_ID,
            message_id: mockMessages[0].id,
            branch_id: 'main',
            user_id: 'user-1',
            is_thread: false,
            message_type: 'user',
            sequence_number: 1,
            user_turn_number: 1,
            branch_turn_number: 1,
            created_at: new Date('2024-01-01'),
          },
        ],
      });

      const response = await api
        .get('/branch')
        .set('x-tw-shop-id', TEST_SHOP_ID)
        .query({ sessionId: TEST_SESSION_ID })
        .expect(200);

      expect(response.body).toEqual({
        sessionId: TEST_SESSION_ID,
        shopId: TEST_SHOP_ID,
        branchId: 'main',
        turns: [
          [
            expect.objectContaining({
              messageData: expect.objectContaining({ role: 'user', content: 'Test message' }),
            }),
          ],
        ],
        messageCount: 1,
      });
    });

    it('should group messages into turns correctly with multiple user messages', async () => {
      const mockSession = createMockSession();
      const messages = [
        {
          id: 'msg-1',
          messageData: { role: 'user', content: 'First question' },
        },
        {
          id: 'msg-2',
          messageData: { role: 'assistant', content: 'First answer' },
        },
        {
          id: 'msg-3',
          messageData: { role: 'user', content: 'Second question' },
        },
        {
          id: 'msg-4',
          messageData: { role: 'assistant', content: 'Second answer' },
        },
        {
          id: 'msg-5',
          messageData: { role: 'assistant', content: 'Additional info' },
        },
      ];

      db.setData({
        sessions: [mockSession],
        messages: messages.map(createMockMessage),
        messageStructure: [
          {
            id: 'struct-1',
            session_id: TEST_SESSION_ID,
            message_id: 'msg-1',
            branch_id: 'main',
            user_id: 'user-1',
            is_thread: false,
            message_type: 'user',
            sequence_number: 1,
            user_turn_number: 1,
            branch_turn_number: 1,
            created_at: new Date('2024-01-01'),
          },
          {
            id: 'struct-2',
            session_id: TEST_SESSION_ID,
            message_id: 'msg-2',
            branch_id: 'main',
            user_id: 'user-1',
            is_thread: false,
            message_type: 'assistant',
            sequence_number: 2,
            user_turn_number: 1,
            branch_turn_number: 2,
            created_at: new Date('2024-01-01'),
          },
          {
            id: 'struct-3',
            session_id: TEST_SESSION_ID,
            message_id: 'msg-3',
            branch_id: 'main',
            user_id: 'user-1',
            is_thread: false,
            message_type: 'user',
            sequence_number: 3,
            user_turn_number: 2,
            branch_turn_number: 3,
            created_at: new Date('2024-01-01'),
          },
          {
            id: 'struct-4',
            session_id: TEST_SESSION_ID,
            message_id: 'msg-4',
            branch_id: 'main',
            user_id: 'user-1',
            is_thread: false,
            message_type: 'assistant',
            sequence_number: 4,
            user_turn_number: 2,
            branch_turn_number: 4,
            created_at: new Date('2024-01-01'),
          },
          {
            id: 'struct-5',
            session_id: TEST_SESSION_ID,
            message_id: 'msg-5',
            branch_id: 'main',
            user_id: 'user-1',
            is_thread: false,
            message_type: 'assistant',
            sequence_number: 5,
            user_turn_number: 2,
            branch_turn_number: 5,
            created_at: new Date('2024-01-01'),
          },
        ],
      });

      const response = await api
        .get('/branch')
        .set('x-tw-shop-id', TEST_SHOP_ID)
        .query({ sessionId: TEST_SESSION_ID })
        .expect(200);

      expect(response.body).toEqual({
        sessionId: TEST_SESSION_ID,
        shopId: TEST_SHOP_ID,
        branchId: 'main',
        turns: [
          [
            expect.objectContaining({
              id: messages[0].id,
              messageData: expect.objectContaining(messages[0].messageData),
            }),
            expect.objectContaining({
              id: messages[1].id,
              messageData: expect.objectContaining(messages[1].messageData),
            }),
          ],
          [
            expect.objectContaining({
              id: messages[2].id,
              messageData: expect.objectContaining(messages[2].messageData),
            }),
            expect.objectContaining({
              id: messages[3].id,
              messageData: expect.objectContaining(messages[3].messageData),
            }),
            expect.objectContaining({
              id: messages[4].id,
              messageData: expect.objectContaining(messages[4].messageData),
            }),
          ],
        ],
        messageCount: 5,
      });
    });

    it('should handle edge case where first message is not a user message', async () => {
      const mockSession = createMockSession();
      const messages = [
        {
          id: 'msg-1',
          messageData: { role: 'assistant', content: 'System message' },
        },
        {
          id: 'msg-2',
          messageData: { role: 'user', content: 'User question' },
        },
        {
          id: 'msg-3',
          messageData: { role: 'assistant', content: 'Answer' },
        },
      ];

      db.setData({
        sessions: [mockSession],
        messages: messages.map(createMockMessage),
        messageStructure: [
          {
            id: 'struct-1',
            session_id: TEST_SESSION_ID,
            message_id: 'msg-1',
            branch_id: 'main',
            user_id: 'user-1',
            is_thread: false,
            message_type: 'assistant',
            sequence_number: 1,
            user_turn_number: 0,
            branch_turn_number: 1,
            created_at: new Date('2024-01-01'),
          },
          {
            id: 'struct-2',
            session_id: TEST_SESSION_ID,
            message_id: 'msg-2',
            branch_id: 'main',
            user_id: 'user-1',
            is_thread: false,
            message_type: 'user',
            sequence_number: 2,
            user_turn_number: 1,
            branch_turn_number: 2,
            created_at: new Date('2024-01-01'),
          },
          {
            id: 'struct-3',
            session_id: TEST_SESSION_ID,
            message_id: 'msg-3',
            branch_id: 'main',
            user_id: 'user-1',
            is_thread: false,
            message_type: 'assistant',
            sequence_number: 3,
            user_turn_number: 1,
            branch_turn_number: 3,
            created_at: new Date('2024-01-01'),
          },
        ],
      });

      const response = await api
        .get('/branch')
        .set('x-tw-shop-id', TEST_SHOP_ID)
        .query({ sessionId: TEST_SESSION_ID })
        .expect(200);

      expect(response.body).toEqual({
        sessionId: TEST_SESSION_ID,
        shopId: TEST_SHOP_ID,
        branchId: 'main',
        turns: [
          [
            expect.objectContaining({
              id: messages[0].id,
              messageData: expect.objectContaining(messages[0].messageData),
            }),
          ],
          [
            expect.objectContaining({
              id: messages[1].id,
              messageData: expect.objectContaining(messages[1].messageData),
            }),
            expect.objectContaining({
              id: messages[2].id,
              messageData: expect.objectContaining(messages[2].messageData),
            }),
          ],
        ],
        messageCount: 3,
      });
    });
  });
});

describe('GET /list', () => {
  const TEST_SHOP_ID = 'test-shop.myshopify.com';

  let api: ReturnType<typeof testRouter>;

  beforeEach(() => {
    api = testRouter(getSessionsRouter());
  });

  const createMockSession = (overrides: Partial<AgentSession> = {}): AgentSession => ({
    sessionId: `session-${Math.random().toString(36).slice(2)}`,
    shopId: TEST_SHOP_ID,
    userId: 'user-1',
    currentBranchId: 'main',
    title: 'Test Session',
    agentType: 'master',
    parentSessionId: null,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    ...overrides,
  });

  describe('with default pagination', () => {
    it('should return sessions with default page=1 and limit=20', async () => {
      const mockSessions = Array.from({ length: 5 }, (_, i) =>
        createMockSession({ sessionId: `session-${i}`, title: `Session ${i}` }),
      );

      db.setData({
        sessions: mockSessions,
        messages: [],
        messageStructure: [],
      });

      const response = await api.get('/list').set('x-tw-shop-id', TEST_SHOP_ID).expect(200);

      expect(response.body).toEqual({
        conversations: mockSessions.map((session) =>
          expect.objectContaining({
            sessionId: session.sessionId,
            title: session.title,
            shopId: TEST_SHOP_ID,
          }),
        ),
        pagination: {
          page: 1,
          limit: 20,
          total: 5,
          totalPages: 1,
          hasNextPage: false,
          hasPreviousPage: false,
        },
      });
    });
  });

  describe('with custom pagination', () => {
    it('should respect custom page and limit parameters', async () => {
      const mockSessions = Array.from({ length: 50 }, (_, i) =>
        createMockSession({ sessionId: `session-${i}` }),
      );

      db.setData({
        sessions: mockSessions,
        messages: [],
        messageStructure: [],
      });

      const response = await api
        .get('/list')
        .set('x-tw-shop-id', TEST_SHOP_ID)
        .query({ page: '2', limit: '10' })
        .expect(200);

      expect(response.body).toEqual({
        conversations: Array.from({ length: 10 }, () => expect.any(Object)),
        pagination: {
          page: 2,
          limit: 10,
          total: 50,
          totalPages: 5,
          hasNextPage: true,
          hasPreviousPage: true,
        },
      });
    });

    it('should cap limit at MAX_LIMIT (100)', async () => {
      db.setData({
        sessions: [],
        messages: [],
        messageStructure: [],
      });

      const response = await api
        .get('/list')
        .set('x-tw-shop-id', TEST_SHOP_ID)
        .query({ limit: '500' })
        .expect(200);

      expect(response.body).toEqual({
        conversations: [],
        pagination: {
          page: 1,
          limit: 100,
          total: 0,
          totalPages: 0,
          hasNextPage: false,
          hasPreviousPage: false,
        },
      });
    });

    it('should handle invalid page gracefully (defaults to 1)', async () => {
      db.setData({
        sessions: [],
        messages: [],
        messageStructure: [],
      });

      const response = await api
        .get('/list')
        .set('x-tw-shop-id', TEST_SHOP_ID)
        .query({ page: '-5' })
        .expect(200);

      expect(response.body).toEqual({
        conversations: [],
        pagination: {
          page: 1,
          limit: 20,
          total: 0,
          totalPages: 0,
          hasNextPage: false,
          hasPreviousPage: false,
        },
      });
    });

    it('should handle invalid limit gracefully (defaults to 20)', async () => {
      db.setData({
        sessions: [],
        messages: [],
        messageStructure: [],
      });

      const response = await api
        .get('/list')
        .set('x-tw-shop-id', TEST_SHOP_ID)
        .query({ limit: 'abc' })
        .expect(200);

      expect(response.body).toEqual({
        conversations: [],
        pagination: {
          page: 1,
          limit: 20,
          total: 0,
          totalPages: 0,
          hasNextPage: false,
          hasPreviousPage: false,
        },
      });
    });
  });

  describe('pagination metadata', () => {
    it('should correctly calculate hasNextPage when on last page', async () => {
      const mockSessions = Array.from({ length: 25 }, (_, i) =>
        createMockSession({ sessionId: `session-${i}` }),
      );

      db.setData({
        sessions: mockSessions,
        messages: [],
        messageStructure: [],
      });

      const response = await api
        .get('/list')
        .set('x-tw-shop-id', TEST_SHOP_ID)
        .query({ page: '3', limit: '10' })
        .expect(200);

      expect(response.body).toEqual({
        conversations: Array.from({ length: 5 }, () => expect.any(Object)),
        pagination: {
          page: 3,
          limit: 10,
          total: 25,
          totalPages: 3,
          hasNextPage: false,
          hasPreviousPage: true,
        },
      });
    });

    it('should correctly calculate hasPreviousPage when on first page', async () => {
      db.setData({
        sessions: [createMockSession()],
        messages: [],
        messageStructure: [],
      });

      const response = await api
        .get('/list')
        .set('x-tw-shop-id', TEST_SHOP_ID)
        .query({ page: '1' })
        .expect(200);

      expect(response.body).toEqual({
        conversations: [expect.any(Object)],
        pagination: {
          page: 1,
          limit: 20,
          total: 1,
          totalPages: 1,
          hasNextPage: false,
          hasPreviousPage: false,
        },
      });
    });

    it('should calculate totalPages correctly', async () => {
      const mockSessions = Array.from({ length: 45 }, (_, i) =>
        createMockSession({ sessionId: `session-${i}` }),
      );

      db.setData({
        sessions: mockSessions,
        messages: [],
        messageStructure: [],
      });

      const response = await api
        .get('/list')
        .set('x-tw-shop-id', TEST_SHOP_ID)
        .query({ limit: '10' })
        .expect(200);

      expect(response.body).toEqual({
        conversations: Array.from({ length: 10 }, () => expect.any(Object)),
        pagination: {
          page: 1,
          limit: 10,
          total: 45,
          totalPages: 5, // ceil(45/10) = 5
          hasNextPage: true,
          hasPreviousPage: false,
        },
      });
    });
  });

  describe('when no sessions exist', () => {
    it('should return empty conversations array with correct pagination', async () => {
      db.setData({
        sessions: [],
        messages: [],
        messageStructure: [],
      });

      const response = await api.get('/list').set('x-tw-shop-id', TEST_SHOP_ID).expect(200);

      expect(response.body).toEqual({
        conversations: [],
        pagination: {
          page: 1,
          limit: 20,
          total: 0,
          totalPages: 0,
          hasNextPage: false,
          hasPreviousPage: false,
        },
      });
    });
  });

  describe('response shape', () => {
    it('should return session data in correct format', async () => {
      const mockSession = createMockSession({
        sessionId: 'session-abc',
        title: 'My Chat Session',
        userId: 'user-123',
        currentBranchId: 'branch-1',
        agentType: 'master',
        parentSessionId: null,
      });

      db.setData({
        sessions: [mockSession],
        messages: [],
        messageStructure: [],
      });

      const response = await api.get('/list').set('x-tw-shop-id', TEST_SHOP_ID).expect(200);

      expect(response.body).toEqual({
        conversations: [
          expect.objectContaining({
            sessionId: 'session-abc',
            shopId: TEST_SHOP_ID,
            title: 'My Chat Session',
            userId: 'user-123',
            currentBranchId: 'branch-1',
            agentType: 'master',
            parentSessionId: null,
          }),
        ],
        pagination: {
          page: 1,
          limit: 20,
          total: 1,
          totalPages: 1,
          hasNextPage: false,
          hasPreviousPage: false,
        },
      });
    });
  });
});
