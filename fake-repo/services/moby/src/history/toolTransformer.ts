import type { Moby } from '@tw/shared-types';
import type {
  RawMessageRow,
  ToolCallPair,
  HistoryTransformConfig,
  HistoryMessageBase,
  FunctionCallMessageData,
  FunctionCallOutputMessageData,
} from './types';
import { DEFAULT_AGENT_NAME } from './types';
import { buildToolEvent, buildToolItem } from '../events/transform/toolEventBuilder';
import type { AnyTypedOutput } from '../events/transform/outputFormatters/types';
import { logger } from '@tw/utils/module/logger';

// Match client types: MessageBase & Moby.CallToolEvent / Moby.ToolOutputEvent
export type CallToolMessage = HistoryMessageBase & Moby.CallToolEvent;
export type ToolOutputMessage = HistoryMessageBase & Moby.ToolOutputEvent;
export type ToolMessage = CallToolMessage | ToolOutputMessage;

function isFunctionCall(row: RawMessageRow): boolean {
  return row.messageType === 'function_call' || row.messageData?.type === 'function_call';
}

function isFunctionCallOutput(row: RawMessageRow): boolean {
  return (
    row.messageType === 'function_call_output' || row.messageData?.type === 'function_call_output'
  );
}

function extractCallId(row: RawMessageRow): string | null {
  return row.messageData?.call_id ?? null;
}

type ToolCallPairPartial = {
  functionCall: RawMessageRow | null;
  functionCallOutput: RawMessageRow | null;
};

export function pairToolCalls(messages: RawMessageRow[]): ToolCallPair[] {
  const callMap = new Map<string, ToolCallPairPartial>();

  const getOrCreatePair = (callId: string): ToolCallPairPartial => {
    let pair = callMap.get(callId);
    if (!pair) {
      pair = { functionCall: null, functionCallOutput: null };
      callMap.set(callId, pair);
    }
    return pair;
  };

  for (const row of messages) {
    const callId = extractCallId(row);
    if (!callId) continue;

    const pair = getOrCreatePair(callId);

    if (isFunctionCall(row)) {
      pair.functionCall = row;
    } else if (isFunctionCallOutput(row)) {
      pair.functionCallOutput = row;
    }
  }

  // Filter to pairs that have a function call (drop orphaned outputs)
  return Array.from(callMap.values()).filter(
    (pair): pair is ToolCallPair => pair.functionCall !== null,
  );
}

export async function transformToolCalls(
  pairs: ToolCallPair[],
  config: HistoryTransformConfig,
): Promise<ToolMessage[]> {
  const results: ToolMessage[] = [];

  for (const pair of pairs) {
    const transformed = await transformSingleToolCall(pair, config);
    if (transformed) {
      results.push(transformed);
    }
  }

  return results;
}

function tryParseJson(str: string): unknown | undefined {
  try {
    return JSON.parse(str);
  } catch {
    return undefined;
  }
}

async function transformSingleToolCall(
  pair: ToolCallPair,
  config: HistoryTransformConfig,
): Promise<ToolMessage | null> {
  const callData = pair.functionCall.messageData as FunctionCallMessageData;
  const callId = callData.call_id;
  const toolName = callData.name;

  try {
    const agentName = DEFAULT_AGENT_NAME;

    const item = buildToolItem({
      toolName,
      callId,
      arguments: callData.arguments ?? '',
      agentName,
      id: callData.id,
      status: callData.status,
    });

    const rawOutput = pair.functionCallOutput
      ? (pair.functionCallOutput.messageData as FunctionCallOutputMessageData).output
      : undefined;

    const typedOutput = rawOutput ? (tryParseJson(rawOutput) as AnyTypedOutput) : undefined;

    const result = await buildToolEvent({
      toolName,
      callId,
      agentName,
      arguments: callData.arguments ?? '',
      item,
      rawOutput,
      typedOutput,
      streamConfig: { workingDir: config.workingDir },
    });

    if (!result) return null;

    return {
      ...result,
      id: callId,
      sessionId: config.sessionId,
      createdAt: pair.functionCall.createdAt,
    } as ToolMessage;
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    logger.error(
      { err, sessionId: config.sessionId, callId, toolName },
      'Failed to transform tool call',
    );
    throw error;
  }
}
