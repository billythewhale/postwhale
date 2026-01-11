import type { Moby } from '@tw/shared-types';
import type { RawMessageRow, HistoryMessageBase, ReasoningMessageData } from './types';
import { DEFAULT_AGENT_NAME } from './types';

export type ReasoningSummaryPartDoneMessage = HistoryMessageBase &
  Moby.ReasoningSummaryPartDoneEvent;

function isReasoningMessage(row: RawMessageRow): boolean {
  return row.messageType === 'reasoning' || row.messageData?.type === 'reasoning';
}

export function transformReasoningMessages(
  messages: RawMessageRow[],
  sessionId: string,
): ReasoningSummaryPartDoneMessage[] {
  const results: ReasoningSummaryPartDoneMessage[] = [];

  for (const row of messages) {
    if (!isReasoningMessage(row)) continue;

    const transformed = transformSingleReasoningMessage(row, sessionId);
    results.push(...transformed);
  }

  return results;
}

function transformSingleReasoningMessage(
  row: RawMessageRow,
  sessionId: string,
): ReasoningSummaryPartDoneMessage[] {
  const data = row.messageData as ReasoningMessageData;
  const reasoningId = data.id;
  const summary = data.summary ?? [];

  if (summary.length === 0) {
    return [];
  }

  return summary.map((item, index) => ({
    type: 'reasoningSummaryPart.done' as const,
    id: `${reasoningId}-${index}`,
    sessionId,
    createdAt: row.createdAt,
    item: {
      agentName: DEFAULT_AGENT_NAME,
      itemId: reasoningId,
      summaryIndex: index,
      part: {
        text: item.text,
        type: 'summary_text' as const,
      },
    },
  }));
}
