import type { EventHandler } from '../types';
import type { Moby } from '@tw/shared-types';

export const handleFunctionCallArgumentsDone: EventHandler<
  'response.function_call_arguments.done',
  Moby.FunctionCallArgumentsDoneEvent
> = (event) => {
  return {
    shouldSend: true,
    transformedEvent: {
      type: 'functionCall.arguments.done',
      item: {
        itemId: event.item_id,
        name: event.name,
        arguments: event.arguments,
        agentName: event.agent_name,
      },
    },
  };
};
