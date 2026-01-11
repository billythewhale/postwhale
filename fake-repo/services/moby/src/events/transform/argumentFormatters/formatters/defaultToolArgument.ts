import type { ArgumentFormatterContext, FormatToolArgumentsResult } from '../types';

export function formatDefaultToolArgument(
  ctx: ArgumentFormatterContext,
): FormatToolArgumentsResult {
  return {
    toolCalled: ctx.toolName,
    arguments: ctx.arguments,
    parsedArguments: null,
  };
}
