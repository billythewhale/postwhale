import type { components } from '@tw/ai-moby-events-client';
import type { Moby } from '@tw/shared-types';
import type { ToolFormatterContext } from '../types';

type DateRange = components['schemas']['DateRangeWithToolName'];
type ResolveDateRangeOutputResult = Pick<Moby.ResolveDateRangeOutput, 'rawOutput' | 'parsedOutput'>;

export const formatResolveDateRange = (
  ctx: ToolFormatterContext<DateRange>,
): ResolveDateRangeOutputResult => {
  // Handle missing typedOutput (e.g., from history path when parsing fails)
  if (!ctx.typedOutput) {
    return {
      rawOutput: ctx.output,
      parsedOutput: {
        startDate: '',
        endDate: '',
      },
    };
  }

  return {
    rawOutput: ctx.output,
    parsedOutput: {
      startDate: ctx.typedOutput.start_date ?? '',
      endDate: ctx.typedOutput.end_date ?? '',
    },
  };
};
