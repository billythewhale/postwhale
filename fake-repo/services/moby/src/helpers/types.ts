import type { SSEMessage, WithShopIdFromHeader, WithUser } from '@tw/utils/module/api/endpoint';
import { MobyStreamEvent } from '../events';

export type RedisStreamDataMessage = {
  type: 'data';
  id: string;
  data: MobyStreamEvent;
};

export type RedisStreamTickMessage = {
  type: 'tick';
};

export type RedisStreamEventMessage = RedisStreamDataMessage | RedisStreamTickMessage;

export type GenericEventType<T = any> = SSEMessage<T>;
