import type { components } from '@tw/ai-moby-events-client';
import type { Moby } from '@tw/shared-types';
import type { ToolFormatterContext } from '../types';

type QueryExecutionOutput = components['schemas']['QueryExecutionOutputWithToolName'];
type ExecuteQueryOutputResult = Pick<Moby.ExecuteQueryOutput, 'rawOutput' | 'parsedOutput'>;

export const formatExecuteQuery = (
  ctx: ToolFormatterContext<QueryExecutionOutput>,
): ExecuteQueryOutputResult => {
  const { typedOutput } = ctx;

  // Handle missing typedOutput - assume raw output is an error message
  if (!typedOutput) {
    return {
      rawOutput: ctx.output,
      parsedOutput: {
        message: '',
        filenames: null,
        data: [],
        bq: 0,
        dataColumns: { x: [], y: [] },
        parameters: [],
        totalRows: null,
        error: ctx.output || 'Unknown error',
      },
    };
  }

  const dataSnippet = typedOutput.data_snippet as {
    columns?: string[];
    rows?: string[][];
    total_rows?: number;
    is_truncated?: boolean;
  } | null;

  // Transform columns/rows to data format: { name: string; value: string[] }[]
  const data: { name: string; value: string[] }[] = [];
  if (dataSnippet?.columns && dataSnippet?.rows) {
    for (let colIndex = 0; colIndex < dataSnippet.columns.length; colIndex++) {
      const columnName = dataSnippet.columns[colIndex];
      const columnValues = dataSnippet.rows.map((row) => row[colIndex] ?? '');
      data.push({ name: columnName, value: columnValues });
    }
  }

  const dataColumns = {
    x: dataSnippet?.columns ?? [],
    y: [] as string[],
  };

  return {
    rawOutput: ctx.output,
    parsedOutput: {
      message: typedOutput.message,
      filenames: typedOutput.file_paths ?? null,
      data,
      bq: 0,
      dataColumns,
      parameters: [],
      totalRows: dataSnippet?.total_rows ?? null,
      error: typedOutput.error ?? null,
    },
  };
};
