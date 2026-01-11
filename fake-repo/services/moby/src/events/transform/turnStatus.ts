import type { EventHandler } from '../types';
import type { Moby } from '@tw/shared-types';

export const handleTurnStatus: EventHandler<'turn_status', Moby.TurnStatusEvent> = (event) => {
  return {
    shouldSend: true,
    transformedEvent: {
      type: 'turnStatus',
      status: event.status,
    },
  };
};
