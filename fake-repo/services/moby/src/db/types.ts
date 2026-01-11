import { ColumnType, Generated, Selectable } from 'kysely';
import { CamelizeObject } from './util';

type BaseTableProps = {
  created_at: ColumnType<Date, string | undefined, string | undefined>;
  updated_at?: ColumnType<Date, string | undefined, string | undefined>;
};

// agent_sessions table
type AgentSessionsTable = BaseTableProps & {
  session_id: string;
  shop_id: string;
  user_id: string | null;
  current_branch_id: string;
  title: string | null;
  agent_type: string;
  parent_session_id: string | null;
};
export type AgentSessionRow = Selectable<AgentSessionsTable>;
export type AgentSession = CamelizeObject<AgentSessionRow>;

// agent_messages table
type AgentMessagesTable = BaseTableProps & {
  id: Generated<string>;
  session_id: string;
  message_data: ColumnType<string, string, never>;
  message_type: string;
};
export type AgentMessageRow = Selectable<AgentMessagesTable>;
export type AgentMessage = CamelizeObject<AgentMessageRow>;
export type AgentMessageParsed = Omit<AgentMessage, 'messageData'> & {
  messageData: Record<string, any>;
};

// message_structure table
type MessageStructureTable = BaseTableProps & {
  id: Generated<string>;
  session_id: string;
  message_id: string;
  branch_id: string;
  user_id: string | null;
  is_thread: boolean;
  message_type: string;
  sequence_number: number;
  user_turn_number: number | null;
  branch_turn_number: number | null;
  global_turn_number?: number | null;
  parent_branch_id?: string | null;
  branched_from_turn?: number | null;
  tool_name?: string | null;
  model_config?: ColumnType<string | null, string | null, never>;
};
export type MessageStructureRow = Selectable<MessageStructureTable>;
export type MessageStructure = CamelizeObject<MessageStructureRow>;

// turn_usage table
type TurnUsageTable = BaseTableProps & {
  id: Generated<string>;
  session_id: string;
  branch_id: string;
  user_turn_number: number;
  requests: number | null;
  input_tokens: number | null;
  output_tokens: number | null;
  total_tokens: number | null;
  input_tokens_details: string | null;
  output_tokens_details: string | null;
  trace_id: string | null;
  trace_url: string | null;
};
export type TurnUsageRow = Selectable<TurnUsageTable>;
export type TurnUsage = CamelizeObject<TurnUsageRow>;

// Database interface combining all tables
export type ChatSessionsDb = {
  agent_sessions: AgentSessionsTable;
  agent_messages: AgentMessagesTable;
  message_structure: MessageStructureTable;
  turn_usage: TurnUsageTable;
};
