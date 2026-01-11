import type { EventHandler, GetEventByType, TransformationResult, StreamConfig } from '../types';
import type { Moby } from '@tw/shared-types';
import type { components } from '@tw/ai-moby-client/module/gen/openapi-typescript';
import { isAllowedAgent } from './utils';
import { buildToolEvent } from './toolEventBuilder';

type ToolExecutionEndContext = components['schemas']['ToolExecutionEndContext'];

function isToolExecutionEndContext(
  ctx: RunItemStreamEvent['execution_context'],
): ctx is ToolExecutionEndContext {
  return ctx?.context_type === 'tool_execution_end';
}

type RunItemStreamEvent = GetEventByType<'run_item_stream_event'>;
type RunItemStreamEventItem = RunItemStreamEvent['item'];

type RunItemTypes = Moby.CallToolEvent | Moby.ToolOutputEvent;

export const handleRunItemStreamEvent: EventHandler<'run_item_stream_event', RunItemTypes> = async (
  event,
  streamConfig,
) => {
  const ctx = buildEventContext(event);
  if (!ctx) return { shouldSend: false };

  if (!isAllowedAgent(ctx.agentCalling)) {
    return { shouldSend: false };
  }

  const rawOutput = event.name === 'tool_output' ? extractRawOutput(event.item) : undefined;

  const result = await buildToolEvent({
    toolName: ctx.toolName,
    callId: ctx.callId,
    agentName: ctx.agentCalling,
    arguments: ctx.baseItem.arguments ?? '',
    item: ctx.baseItem.item,
    rawOutput,
    typedOutput: ctx.typedOutput,
    streamConfig,
  });

  if (!result) return { shouldSend: false };
  return { shouldSend: true, transformedEvent: result };
};

type EventContext = {
  baseItem: Moby.RunItemStreamEventEssential;
  callId: string;
  toolName: string;
  agentCalling: string;
  typedOutput: ToolExecutionEndContext['typed_output'];
};

function buildBaseItem(
  event: GetEventByType<'run_item_stream_event'>,
): Moby.RunItemStreamEventEssential {
  const { execution_context } = event;
  return {
    item: event.item,
    arguments: (event.item.raw_item as { arguments?: string } | undefined)?.arguments ?? '',
    executionContext: execution_context
      ? {
          contextType: execution_context.context_type,
          agentName: execution_context.agent_name,
          toolName: execution_context.tool_name,
        }
      : undefined,
  };
}

function extractCallId(item: RunItemStreamEventItem): string {
  if ('raw_item' in item && item.raw_item) {
    const rawItem = item.raw_item as { call_id?: string };
    return rawItem.call_id ?? '';
  }
  return '';
}

function buildEventContext(event: GetEventByType<'run_item_stream_event'>): EventContext | null {
  const toolName = event?.execution_context?.tool_name;
  const callId = extractCallId(event.item);

  if (!toolName || !callId) return null;

  let typedOutput;
  if (isToolExecutionEndContext(event.execution_context)) {
    typedOutput = event.execution_context.typed_output;
  } else {
    typedOutput = undefined;
  }

  return {
    baseItem: buildBaseItem(event),
    callId,
    toolName,
    agentCalling: event?.agent_name || event?.execution_context?.agent_name || 'unknown',
    typedOutput,
  };
}

function extractRawOutput(item: RunItemStreamEventItem): string {
  if ('raw_item' in item && item.raw_item) {
    const rawItem = item.raw_item as { output?: string };
    return rawItem.output ?? '';
  }
  return '';
}
