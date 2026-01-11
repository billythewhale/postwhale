import type { EventHandler } from '../types';
import type { Moby } from '@tw/shared-types';
import { logger } from '@tw/utils/module/logger';

export const handleReasoningSummaryPartAdded: EventHandler<
  'response.reasoning_summary_part.added',
  Moby.ReasoningSummaryPartAddedEvent
> = (event) => {
  return {
    shouldSend: true,
    transformedEvent: {
      type: 'reasoningSummaryPart.added',
      item: {
        itemId: event.item_id,
        summaryIndex: event.summary_index,
        part: event.part,
        agentName: event.agent_name,
      },
    },
  };
};

export const handleReasoningSummaryPartDone: EventHandler<
  'response.reasoning_summary_part.done',
  Moby.ReasoningSummaryPartDoneEvent
> = (event) => {
  return {
    shouldSend: true,
    transformedEvent: {
      type: 'reasoningSummaryPart.done',
      item: {
        agentName: event.agent_name,
        itemId: event.item_id,
        summaryIndex: event.summary_index,
        part: event.part,
      },
    },
  };
};
