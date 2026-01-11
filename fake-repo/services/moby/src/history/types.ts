import type { StreamConfig } from '../events/types';
import type { components } from '@tw/ai-moby-events-client';

export const DEFAULT_AGENT_NAME = 'master_moby_agent';

export type ReasoningMessageData = components['schemas']['ResponseReasoningItem'];
export type FunctionCallMessageData = components['schemas']['ResponseFunctionToolCallParam'];
// Our DB stores output as string, narrower than the schema's union type
export type FunctionCallOutputMessageData = Omit<
  components['schemas']['FunctionCallOutput'],
  'output'
> & {
  output: string;
};

// Raw DB row type - before JSON parsing
export type DbMessageRow = {
  id: string;
  sessionId: string;
  messageData: string | Record<string, any>;
  createdAt: string | Date;
  messageType: string;
};

// Parsed message row - after JSON parsing
export type RawMessageRow = {
  id: string;
  sessionId: string;
  messageData: Record<string, any>;
  createdAt: string;
  messageType: string;
};

export type ToolCallPair = {
  functionCall: RawMessageRow;
  functionCallOutput: RawMessageRow | null;
};

export type HistoryTransformConfig = StreamConfig & {
  sessionId: string;
};

// Base type for history messages - matches client's MessageBase
export type HistoryMessageBase = {
  id: string;
  sessionId: string;
  createdAt: string;
};
