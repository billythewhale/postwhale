import type { components } from '@tw/ai-moby-events-client';
import type { ToolFormatter } from '../types';
import { generateSignedUrlsForFiles } from '../utils';
import { logger } from '@tw/utils/module/logger';
import type { Moby } from '@tw/shared-types';

type CreativeToolOutput = components['schemas']['CreativeToolOutputWithToolName'];

type CreativeToolOutputResult = Pick<Moby.CreativeToolOutput, 'rawOutput' | 'parsedOutput'>;

export const formatCreativeTool: ToolFormatter<'creative_tool', CreativeToolOutput> = async (
  ctx,
): Promise<CreativeToolOutputResult> => {
  // Handle missing typedOutput - assume raw output is an error message
  if (!ctx.typedOutput) {
    return {
      rawOutput: ctx.output,
      parsedOutput: {
        inputUrls: [],
        outputUrls: [],
        output: [],
        summary_result: '',
        error: ctx.output || 'Unknown error',
      },
    };
  }

  const outputUrls = ctx.typedOutput.output_files ?? [];
  const output = await generateSignedUrlsForFiles(ctx.streamConfig.workingDir, outputUrls);

  // input_files contains objects with { path, mime } - extract the path URLs
  const inputFiles = ctx.typedOutput.input_files ?? [];
  const inputUrls = inputFiles
    .map((file) => (file as { path?: string })?.path)
    .filter((url): url is string => !!url);

  return {
    rawOutput: ctx.output,
    parsedOutput: {
      inputUrls,
      outputUrls,
      output,
      summary_result: ctx.typedOutput.summary_result,
      error: ctx.typedOutput.error || null,
    },
  };
};
