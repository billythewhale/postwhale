import type { Moby } from '@tw/shared-types';
import type {
  DbMessageRow,
  RawMessageRow,
  HistoryTransformConfig,
  HistoryMessageBase,
} from './types';
import { pairToolCalls, transformToolCalls, type ToolMessage } from './toolTransformer';
import {
  transformReasoningMessages,
  type ReasoningSummaryPartDoneMessage,
} from './reasoningTransformer';

function parseDbRow(row: DbMessageRow, sessionId: string): RawMessageRow {
  let parsedMessageData: Record<string, any>;
  try {
    parsedMessageData =
      typeof row.messageData === 'string' ? JSON.parse(row.messageData) : row.messageData;
  } catch {
    parsedMessageData = {};
  }

  return {
    id: row.id,
    sessionId,
    messageData: parsedMessageData,
    createdAt: typeof row.createdAt === 'string' ? row.createdAt : row.createdAt.toISOString(),
    messageType: row.messageType,
  };
}

// Message data types - extract from event types
type UserMessageData = Moby.UserMessageAddedEvent['item'];
type AssistantMessageData = Moby.AssistantMessageAddedEvent['item'];

// Output types - compose with HistoryMessageBase
export type UserMessage = HistoryMessageBase & Moby.UserMessageAddedEvent['item'];
export type AssistantMessage = HistoryMessageBase & Moby.AssistantMessageAddedEvent['item'];

function isUserMessage(row: RawMessageRow): boolean {
  return row.messageType === 'user' || row.messageData?.role === 'user';
}

function isAssistantMessage(row: RawMessageRow): boolean {
  return (
    row.messageType === 'assistant' ||
    (row.messageData?.role === 'assistant' && row.messageData?.type === 'message')
  );
}

function isReasoningMessage(row: RawMessageRow): boolean {
  return row.messageType === 'reasoning' || row.messageData?.type === 'reasoning';
}

function isFunctionCallMessage(row: RawMessageRow): boolean {
  return row.messageType === 'function_call' || row.messageData?.type === 'function_call';
}

function transformUserMessage(row: RawMessageRow, sessionId: string): UserMessage {
  const data = row.messageData as UserMessageData;
  return {
    id: row.id,
    sessionId,
    createdAt: row.createdAt,
    role: 'user',
    content: data.content,
  };
}

function transformAssistantMessage(row: RawMessageRow, sessionId: string): AssistantMessage {
  const data = row.messageData as AssistantMessageData;
  return {
    id: data.id ?? row.id,
    sessionId,
    createdAt: row.createdAt,
    role: 'assistant',
    type: 'message',
    content: data.content,
    status: data.status,
  };
}

export type TransformedMessage =
  | UserMessage
  | AssistantMessage
  | ToolMessage
  | ReasoningSummaryPartDoneMessage;

export async function transformHistoryMessages(
  dbRows: DbMessageRow[],
  config: HistoryTransformConfig,
): Promise<TransformedMessage[]> {
  const rawMessages = dbRows.map((row) => parseDbRow(row, config.sessionId));

  // Pre-transform tool calls and reasoning, indexed by ID for O(1) lookup
  const toolPairs = pairToolCalls(rawMessages);
  const toolOutputEvents = await transformToolCalls(toolPairs, config);
  const toolEventsByCallId = new Map(toolOutputEvents.map((e) => [e.callId, e]));

  const reasoningMessages = transformReasoningMessages(rawMessages, config.sessionId);
  const reasoningByItemId = new Map<string, ReasoningSummaryPartDoneMessage[]>();
  for (const msg of reasoningMessages) {
    const existing = reasoningByItemId.get(msg.item.itemId) ?? [];
    existing.push(msg);
    reasoningByItemId.set(msg.item.itemId, existing);
  }

  // Track which IDs we've already emitted (each should appear once)
  const emittedReasoningIds = new Set<string>();
  const emittedCallIds = new Set<string>();

  const results: TransformedMessage[] = [];

  for (const row of rawMessages) {
    if (isUserMessage(row)) {
      results.push(transformUserMessage(row, config.sessionId));
      continue;
    }

    if (isAssistantMessage(row)) {
      results.push(transformAssistantMessage(row, config.sessionId));
      continue;
    }

    if (isReasoningMessage(row)) {
      const reasoningId = row.messageData?.id;
      if (!reasoningId || emittedReasoningIds.has(reasoningId)) continue;

      const messages = reasoningByItemId.get(reasoningId);
      if (messages) {
        results.push(...messages);
        emittedReasoningIds.add(reasoningId);
      }
      continue;
    }

    if (isFunctionCallMessage(row)) {
      const callId = row.messageData?.call_id;
      if (!callId || emittedCallIds.has(callId)) continue;

      const toolEvent = toolEventsByCallId.get(callId);
      if (toolEvent) {
        results.push(toolEvent);
        emittedCallIds.add(callId);
      }
    }
  }

  return results;
}
