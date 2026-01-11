import type { Moby } from '@tw/shared-types';
import { formatToolOutput } from './outputFormatters';
import { formatToolArguments } from './argumentFormatters';
import { isAllowedName } from './utils';
import type { AnyTypedOutput } from './outputFormatters/types';
import type { StreamConfig } from '../types';

export type ToolEventInput = {
  toolName: string;
  callId: string;
  agentName: string;
  arguments: string;
  item: Moby.RunItemStreamEventEssential['item'];
  rawOutput?: string; // undefined = CallToolEvent, present = ToolOutputEvent
  typedOutput?: AnyTypedOutput;
  streamConfig: StreamConfig;
};

export type ToolEvent = Moby.CallToolEvent | Moby.ToolOutputEvent;

/**
 * Core tool event builder - shared between SSE and history paths.
 * Returns null if tool is not allowed.
 */
export async function buildToolEvent(input: ToolEventInput): Promise<ToolEvent | null> {
  if (!isAllowedName(input.toolName)) {
    return null;
  }

  const toolArgs = formatToolArguments({
    toolName: input.toolName,
    agentName: input.agentName,
    arguments: input.arguments,
  });

  // No output = CallToolEvent (in-progress)
  if (input.rawOutput === undefined) {
    return {
      type: 'CallToolEvent',
      callId: input.callId,
      item: input.item,
      agentCalling: input.agentName,
      toolCalled: toolArgs.toolCalled,
      arguments: toolArgs.arguments,
      parsedArguments: toolArgs.parsedArguments,
    } as Moby.CallToolEvent;
  }

  // Has output = ToolOutputEvent
  const { rawOutput, parsedOutput } = await formatToolOutput({
    toolName: input.toolName,
    agentName: input.agentName,
    output: input.rawOutput,
    typedOutput: input.typedOutput,
    streamConfig: input.streamConfig,
  });

  return {
    type: 'ToolOutputEvent',
    callId: input.callId,
    item: input.item,
    toolCalled: toolArgs.toolCalled,
    agentCalling: input.agentName,
    rawOutput,
    parsedOutput,
  } as Moby.ToolOutputEvent;
}

/**
 * Build RunItemStreamEventEssential item structure.
 * Used by history path to reconstruct item from DB data.
 */
export function buildToolItem(params: {
  toolName: string;
  callId: string;
  arguments: string;
  agentName: string;
  id?: string;
  status?: string;
}): Moby.RunItemStreamEventEssential['item'] {
  return {
    type: 'tool_call_item',
    agent: params.agentName,
    raw_item: {
      name: params.toolName,
      call_id: params.callId,
      arguments: params.arguments,
      type: 'function_call',
      id: params.id,
      status: params.status ?? 'completed',
    },
  } as Moby.RunItemStreamEventEssential['item'];
}
