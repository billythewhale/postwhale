import type {
  TypedEventHandlers,
  TransformationResult,
  EventTypeString,
  GetEventByType,
  StreamConfig,
} from './types';
import { handleTurnStatus } from './transform/turnStatus';
import {
  handleResponseOutputItemAdded,
  handleResponseOutputItemDone,
} from './transform/outputItem';
import { handleOutputTextDelta } from './transform/outputText';
import { handleRunItemStreamEvent } from './transform/runItemStreamEvent';
import { handleFunctionCallArgumentsDone } from './transform/functionCallArguments';
import {
  handleReasoningSummaryPartAdded,
  handleReasoningSummaryPartDone,
} from './transform/reasoningSummary';

/*
 *  If handler returns:
 *    { shouldSend: true, transformedEvent: {...} }
 *      -> send transformedEvent to client
 *    { shouldSend: true }
 *      -> send original event to client
 *    { shouldSend: false }
 *      -> do not send anything to client
 *
 *  Event types that don't match a key in this map will be IGNORED.
 */
const eventHandlers: TypedEventHandlers = {
  turn_status: handleTurnStatus,
  'response.output_item.added': handleResponseOutputItemAdded,
  'response.output_item.done': handleResponseOutputItemDone,
  'response.output_text.delta': handleOutputTextDelta,
  run_item_stream_event: handleRunItemStreamEvent,
  'response.reasoning_summary_part.added': handleReasoningSummaryPartAdded,
  'response.reasoning_summary_part.done': handleReasoningSummaryPartDone,
  'response.function_call_arguments.done': handleFunctionCallArgumentsDone,
};

export async function handleEvent<K extends EventTypeString>(
  event: GetEventByType<K>,
  streamConfig: StreamConfig,
): Promise<TransformationResult | undefined> {
  return eventHandlers[event.type as K]?.(event, streamConfig);
}

export type * from './types';
export * from './transform/turnStatus';
