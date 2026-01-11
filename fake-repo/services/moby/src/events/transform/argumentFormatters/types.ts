import type { Moby } from '@tw/shared-types';

export type ArgumentFormatterContext = {
  toolName: string;
  agentName?: string;
  arguments: string;
};

export type FormatToolArgumentsResult = Moby.ToolArguments;

export type ParsedArgumentsFor<T extends string> = Extract<
  Moby.KnownToolArguments,
  { toolCalled: T }
> extends { parsedArguments: infer P }
  ? P
  : null;

export type ArgumentFormatter<TToolName extends string> = (
  ctx: ArgumentFormatterContext,
) => FormatToolArgumentsResult & {
  toolCalled: TToolName;
  parsedArguments: ParsedArgumentsFor<TToolName>;
};
