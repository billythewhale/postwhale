import { logger } from '@tw/utils/module/logger';
import { ZodError, ZodIssue } from 'zod';
import { Request, Response } from '@tw/utils/module/express';

export function handleError(error: any, res: Response) {
  if (error instanceof ZodError) {
    const zodError = error as ZodError;
    if (zodError.issues.length) {
      logger.error('Validation error processing order', JSON.stringify(zodError));
      return res.status(400).json({ success: false, message: formatZodError(zodError) });
    }
  }
  logger.error('Error processing order', JSON.stringify(error));
  return res.status(500).json({ success: false, message: 'Internal Error' });
}

export function formatZodError(error: ZodError): string {
  const zodError = error as ZodError;
  if (zodError.issues.length) {
    const issue = zodError.issues[0];
    const field = issue.path[issue.path.length - 1];
    const errorMessage = `${field} is ${issue.message.toLowerCase()}`;
    return errorMessage;
  }
  return 'Internal Error';
}
