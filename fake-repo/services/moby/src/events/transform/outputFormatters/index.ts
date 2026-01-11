import type { ToolFormatterContext, FormatToolOutputResult } from './types';
import { toolRegistry, type ToolName } from '../toolRegistry';

export async function formatToolOutput(ctx: ToolFormatterContext): Promise<FormatToolOutputResult> {
  const entry = toolRegistry[ctx.toolName as ToolName];
  return (
    entry.outputFormatter as (
      ctx: ToolFormatterContext,
    ) => FormatToolOutputResult | Promise<FormatToolOutputResult>
  )(ctx);
}
