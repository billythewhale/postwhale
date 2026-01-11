import type { EventHandler } from '../types';
import type { Moby } from '@tw/shared-types';

export const handleOutputTextDelta: EventHandler<
  'response.output_text.delta',
  Moby.OutputTextDeltaEvent
> = (event) => {
  return {
    shouldSend: true,
    transformedEvent: {
      type: 'outputText.delta',
      itemId: event.item_id,
      contentIndex: event.content_index,
      delta: event.delta,
      sequenceNumber: event.sequence_number,
    },
  };
};
