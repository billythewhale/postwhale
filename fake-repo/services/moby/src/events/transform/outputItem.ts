import type { EventHandler, GetEventByType, TransformationResult } from '../types';
import type { Moby } from '@tw/shared-types/module/moby/index';

export const handleResponseOutputItemAdded: EventHandler<'response.output_item.added'> = (
  event,
) => {
  switch (event.item.type) {
    case 'reasoning':
      return sendReasoningAdded(event);
    case 'message':
      return sendAssistantMessage(event);
    default:
      return { shouldSend: false };
  }
};

export const handleResponseOutputItemDone: EventHandler<'response.output_item.done'> = (event) => {
  switch (event.item.type) {
    case 'reasoning':
      return sendReasoningDone(event);
    default:
      return { shouldSend: false };
  }
};

function sendReasoningAdded(event: any): TransformationResult<Moby.ReasoningItemAddedEvent> {
  return {
    shouldSend: true,
    transformedEvent: {
      type: 'reasoningItem.added',
      item: createReasoningItem(event),
    },
  };
}

function sendReasoningDone(event: any): TransformationResult<Moby.ReasoningItemDoneEvent> {
  return {
    shouldSend: true,
    transformedEvent: {
      type: 'reasoningItem.done',
      item: createReasoningItem(event),
    },
  };
}

function sendAssistantMessage(event: any): TransformationResult<Moby.AssistantMessageAddedEvent> {
  return {
    shouldSend: true,
    transformedEvent: {
      type: 'assistantMessage.added',
      item: createAssistantMessageEvent(event),
    },
  };
}

type ItemAddedEvent<T extends GetEventByType<'response.output_item.added'>['item']['type']> = Omit<
  GetEventByType<'response.output_item.added'>,
  'item'
> & { item: Extract<GetEventByType<'response.output_item.added'>['item'], { type: T }> };
type ItemDoneEvent<T extends GetEventByType<'response.output_item.done'>['item']['type']> = Omit<
  GetEventByType<'response.output_item.done'>,
  'item'
> & { item: Extract<GetEventByType<'response.output_item.done'>['item'], { type: T }> };
function createReasoningItem(event: ItemAddedEvent<'reasoning'> | ItemDoneEvent<'reasoning'>) {
  return {
    id: event.item.id,
    type: event.item.type,
    summary: event.item.summary,
    status: event.item.status,
  };
}

function createAssistantMessageEvent(event: ItemAddedEvent<'message'>) {
  return {
    id: event.item.id,
    type: event.item.type,
    role: event.item.role,
    content: event.item.content,
    status: event.item.status,
  };
}
