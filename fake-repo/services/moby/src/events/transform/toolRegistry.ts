import type { ToolFormatterContext, FormatToolOutputResult } from './outputFormatters/types';
import type {
  ArgumentFormatterContext,
  FormatToolArgumentsResult,
} from './argumentFormatters/types';
import * as outputFormatters from './outputFormatters/formatters';
import * as argumentFormatters from './argumentFormatters/formatters';
import type { AnyTypedOutput } from './outputFormatters/types';

type OutputFormatter<T = AnyTypedOutput> = (
  ctx: ToolFormatterContext<T>,
) => FormatToolOutputResult | Promise<FormatToolOutputResult>;
type ArgumentFormatter = (ctx: ArgumentFormatterContext) => FormatToolArgumentsResult;

type ToolFormatterEntry<T = AnyTypedOutput> = {
  outputFormatter: OutputFormatter<T>;
  argumentFormatter: ArgumentFormatter;
};

const toolRegistry = {
  resolve_date_range: {
    outputFormatter: outputFormatters.formatResolveDateRange,
    argumentFormatter: argumentFormatters.formatDefaultToolArgument,
  },
  query_table_schema_info: {
    outputFormatter: outputFormatters.formatDefaultToolOutput,
    argumentFormatter: argumentFormatters.formatDefaultToolArgument,
  },
  similarity_search: {
    outputFormatter: outputFormatters.formatDefaultToolOutput,
    argumentFormatter: argumentFormatters.formatDefaultToolArgument,
  },
  gsutil: {
    outputFormatter: outputFormatters.formatDefaultToolOutput,
    argumentFormatter: argumentFormatters.formatDefaultToolArgument,
  },
  execute_query: {
    outputFormatter: outputFormatters.formatExecuteQuery,
    argumentFormatter: argumentFormatters.formatExecuteQueryArguments,
  },
  validate_question: {
    outputFormatter: outputFormatters.formatDefaultToolOutput,
    argumentFormatter: argumentFormatters.formatDefaultToolArgument,
  },
  code_executor: {
    outputFormatter: outputFormatters.formatDefaultToolOutput,
    argumentFormatter: argumentFormatters.formatDefaultToolArgument,
  },
  computer_use: {
    outputFormatter: outputFormatters.formatDefaultToolOutput,
    argumentFormatter: argumentFormatters.formatDefaultToolArgument,
  },
  creative_tool: {
    outputFormatter: outputFormatters.formatCreativeTool,
    argumentFormatter: argumentFormatters.formatDefaultToolArgument,
  },
  vision: {
    outputFormatter: outputFormatters.formatDefaultToolOutput,
    argumentFormatter: argumentFormatters.formatDefaultToolArgument,
  },
  execute_forecast: {
    outputFormatter: outputFormatters.formatDefaultToolOutput,
    argumentFormatter: argumentFormatters.formatDefaultToolArgument,
  },
  prepare_data: {
    outputFormatter: outputFormatters.formatDefaultToolOutput,
    argumentFormatter: argumentFormatters.formatDefaultToolArgument,
  },
  save_inline_timeseries: {
    outputFormatter: outputFormatters.formatDefaultToolOutput,
    argumentFormatter: argumentFormatters.formatDefaultToolArgument,
  },
  manage_audiences: {
    outputFormatter: outputFormatters.formatDefaultToolOutput,
    argumentFormatter: argumentFormatters.formatDefaultToolArgument,
  },
  manage_creative: {
    outputFormatter: outputFormatters.formatDefaultToolOutput,
    argumentFormatter: argumentFormatters.formatDefaultToolArgument,
  },
  manage_optimization: {
    outputFormatter: outputFormatters.formatDefaultToolOutput,
    argumentFormatter: argumentFormatters.formatDefaultToolArgument,
  },
  manage_promotions: {
    outputFormatter: outputFormatters.formatDefaultToolOutput,
    argumentFormatter: argumentFormatters.formatDefaultToolArgument,
  },
  manage_structure: {
    outputFormatter: outputFormatters.formatDefaultToolOutput,
    argumentFormatter: argumentFormatters.formatDefaultToolArgument,
  },
  get_metrics: {
    outputFormatter: outputFormatters.formatDefaultToolOutput,
    argumentFormatter: argumentFormatters.formatDefaultToolArgument,
  },
  web_search: {
    outputFormatter: outputFormatters.formatDefaultToolOutput,
    argumentFormatter: argumentFormatters.formatDefaultToolArgument,
  },
  memory: {
    outputFormatter: outputFormatters.formatDefaultToolOutput,
    argumentFormatter: argumentFormatters.formatDefaultToolArgument,
  },
  get_metric_details: {
    outputFormatter: outputFormatters.formatDefaultToolOutput,
    argumentFormatter: argumentFormatters.formatDefaultToolArgument,
  },
  summary_page: {
    outputFormatter: outputFormatters.formatDefaultToolOutput,
    argumentFormatter: argumentFormatters.formatDefaultToolArgument,
  },
  file_manager: {
    outputFormatter: outputFormatters.formatDefaultToolOutput,
    argumentFormatter: argumentFormatters.formatDefaultToolArgument,
  },
  search_verified_sql_examples: {
    outputFormatter: outputFormatters.formatDefaultToolOutput,
    argumentFormatter: argumentFormatters.formatDefaultToolArgument,
  },
  get_knowledge_base_sources: {
    outputFormatter: outputFormatters.formatDefaultToolOutput,
    argumentFormatter: argumentFormatters.formatDefaultToolArgument,
  },
  get_knowledge_base_details: {
    outputFormatter: outputFormatters.formatDefaultToolOutput,
    argumentFormatter: argumentFormatters.formatDefaultToolArgument,
  },
  code_interpreter: {
    outputFormatter: outputFormatters.formatDefaultToolOutput,
    argumentFormatter: argumentFormatters.formatDefaultToolArgument,
  },
  query_knowledge_base: {
    outputFormatter: outputFormatters.formatDefaultToolOutput,
    argumentFormatter: argumentFormatters.formatDefaultToolArgument,
  },
  prepare_timeseries: {
    outputFormatter: outputFormatters.formatDefaultToolOutput,
    argumentFormatter: argumentFormatters.formatDefaultToolArgument,
  },
} as const satisfies Record<string, ToolFormatterEntry<any>>;

export type ToolName = keyof typeof toolRegistry;
const TOOL_NAMES = Object.keys(toolRegistry) as ToolName[];
export const TOOL_NAME_SET = new Set<string>(TOOL_NAMES);
export const ALLOWED_NAME_SET = TOOL_NAME_SET;
export type AllowedName = ToolName;

export { toolRegistry };
