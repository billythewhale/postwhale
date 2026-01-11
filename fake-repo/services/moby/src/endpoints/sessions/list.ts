import { logger } from '@tw/utils/module/logger';
import {
  SuccessResponse,
  BadRequestErrorResponse,
  ServerErrorResponse,
  ErrorResponse,
} from '@tw/utils/module/api/endpoint';
import { getSessionsByShopIdPaginated, getSessionsCountByShopId } from '../../db';
import { ListSessionsRequest, ListSessionsResponse, PaginationMetadata } from '@tw/shared-types';

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

export async function listSessions(
  data: ListSessionsRequest,
): Promise<SuccessResponse<ListSessionsResponse>> {
  const { shopId, page, limit } = data;

  logger.debug({ shopId, page, limit }, 'Sessions history request');

  if (!shopId) {
    logger.warn({ shopId }, 'Missing shop ID');
    throw new BadRequestErrorResponse('Shop ID is required');
  }

  const parsedPage = page ? parseInt(page, 10) : DEFAULT_PAGE;
  const parsedLimit = limit ? parseInt(limit, 10) : DEFAULT_LIMIT;

  const validatedPage = validateInt(parsedPage, DEFAULT_PAGE);
  const validatedLimit = validateInt(parsedLimit, DEFAULT_LIMIT, 1, MAX_LIMIT);

  try {
    const [sessions, totalCount] = await Promise.all([
      getSessionsByShopIdPaginated(shopId, validatedPage, validatedLimit),
      getSessionsCountByShopId(shopId),
    ]);

    const totalPages = Math.ceil(totalCount / validatedLimit);

    const pagination: PaginationMetadata = {
      page: validatedPage,
      limit: validatedLimit,
      total: totalCount,
      totalPages: totalPages,
      hasNextPage: validatedPage < totalPages,
      hasPreviousPage: validatedPage > 1,
    };

    const response: ListSessionsResponse = {
      conversations: sessions,
      pagination,
    };

    logger.debug(
      {
        shopId,
        page: validatedPage,
        limit: validatedLimit,
        sessionCount: sessions.length,
        totalCount,
      },
      'Sessions history retrieved successfully',
    );

    return new SuccessResponse(response);
  } catch (error) {
    if (error instanceof ErrorResponse) {
      throw error;
    }

    logger.error({ error, shopId, page, limit }, 'Failed to get sessions history');
    throw new ServerErrorResponse('Failed to retrieve sessions history');
  }
}

const validateInt = (value: number, defaultValue: number, min = 1, max = Infinity): number =>
  Math.min(max, Math.max(min, Math.floor(value) || defaultValue));
