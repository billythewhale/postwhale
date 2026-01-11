import type { ArgumentFormatter } from '../types';

export const formatExecuteQueryArguments: ArgumentFormatter<'execute_query'> = (ctx) => {
  let parsedArguments = { query: '', file_path: '' };

  try {
    const parsed = JSON.parse(ctx.arguments);
    const inputData = parsed.input_data ?? {};
    parsedArguments = {
      query: inputData.query ?? '',
      file_path: inputData.file_path ?? '',
    };
  } catch {
    // Keep default empty values if parsing fails
  }

  return {
    toolCalled: 'execute_query',
    arguments: ctx.arguments,
    parsedArguments,
  };
};
