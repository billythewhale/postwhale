import type { ToolFormatterContext, FormatToolOutputResult } from '../types';

export function formatDefaultToolOutput(ctx: ToolFormatterContext): FormatToolOutputResult {
  return {
    rawOutput: ctx.output,
    parsedOutput: null,
  };
}
