export type BranchInfo = {
  isThread: boolean;
  isCurrent: boolean;
  parentBranchId?: string | null;
  branchedFromTurn?: number | null;
};

export type ConversationTurn = {
  turnNumber: number;
  branches: TurnBranch[];
};

export type TurnBranchEvent = {
  messageId: string;
  messageType: string;
  sequenceNumber: number;
  messageData: Record<string, any>;
  toolName?: string | null;
  modelConfig?: Record<string, any> | null;
  createdAt: Date | string;
};

export type TurnBranch = {
  branchId: string;
  isThread: boolean;
  isCurrent: boolean;
  fromTurn?: number | null;
  fromBranch?: string | null;
  events: TurnBranchEvent[];
};
