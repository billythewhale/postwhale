import type { Moby } from '@tw/shared-types';
import type { components } from '@tw/ai-moby-client/module/gen/openapi-typescript';
import type { StreamConfig } from '../../types';

export type AnyTypedOutput = components['schemas']['ToolExecutionEndContext']['typed_output'];

export type ToolFormatterContext<TTypedOutput = AnyTypedOutput> = {
  toolName: string;
  output: string;
  typedOutput: TTypedOutput;
  streamConfig: StreamConfig;
  agentName?: string;
};

export type FormatToolOutputResult = Pick<Moby.ToolOutput, 'rawOutput' | 'parsedOutput'>;

export type ParsedOutputFor<T extends string> = Extract<
  Moby.KnownToolOutput,
  { toolCalled: T }
> extends { parsedOutput: infer P }
  ? P
  : null;

type FormatterResult<TToolName extends string> = FormatToolOutputResult & {
  parsedOutput: ParsedOutputFor<TToolName>;
};

export type ToolFormatter<TToolName extends string, TTypedOutput> = (
  ctx: ToolFormatterContext<TTypedOutput>,
) => FormatterResult<TToolName> | Promise<FormatterResult<TToolName>>;
