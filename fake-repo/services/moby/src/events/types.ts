import type { ChatMainStreamEventsTypesResponse } from '@tw/ai-moby-client';

type ExpandTypeDiscriminant<T> = T extends { type: infer Type }
  ? Type extends string
    ? Omit<T, 'type'> & { type: Type }
    : T
  : T;

export type MobyStreamEvent = ExpandTypeDiscriminant<ChatMainStreamEventsTypesResponse[number]>;

export type TransformationResult<T = any> = {
  shouldSend: boolean;
  transformedEvent?: T;
};

type AllEvents = MobyStreamEvent;
export type EventTypeString = AllEvents['type'];

type EventTypeMap = {
  [K in EventTypeString]: Extract<AllEvents, { type: K }>;
};

export type GetEventByType<T extends EventTypeString> = EventTypeMap[T];
export type EventHandler<T extends EventTypeString, R extends any = any> = (
  event: GetEventByType<T>,
  config: StreamConfig,
) => TransformationResult<R> | Promise<TransformationResult<R>>;

export type TypedEventHandlers = {
  [K in EventTypeString]?: EventHandler<K>;
};

export type StreamConfig = {
  workingDir: string;
};
