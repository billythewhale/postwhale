import type { ArgumentFormatterContext, FormatToolArgumentsResult } from './types';
import { toolRegistry, type ToolName } from '../toolRegistry';

export function formatToolArguments(ctx: ArgumentFormatterContext): FormatToolArgumentsResult {
  const entry = toolRegistry[ctx.toolName as ToolName];
  return entry.argumentFormatter(ctx);
}

export type { ArgumentFormatterContext, FormatToolArgumentsResult } from './types';
