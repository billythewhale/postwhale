import { TOOL_NAME_SET, ALLOWED_NAME_SET, type ToolName, type AllowedName } from './toolRegistry';

const ALLOWED_AGENTS = [
  'Moby',
  'CodeExecutorAgent',
  'ComputerUseAgent',
  'master_moby_agent',
] as const;

export type AllowedAgent = (typeof ALLOWED_AGENTS)[number];
export const ALLOWED_AGENT_SET = new Set<string>(ALLOWED_AGENTS);

export function isAllowedAgent(name: string): name is AllowedAgent {
  return ALLOWED_AGENT_SET.has(name);
}

export function isToolName(name: string): name is ToolName {
  return TOOL_NAME_SET.has(name);
}

export function isAllowedName(name: string): name is AllowedName {
  return ALLOWED_NAME_SET.has(name);
}
