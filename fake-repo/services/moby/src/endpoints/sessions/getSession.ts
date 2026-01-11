import { logger } from '@tw/utils/module/logger';
import {
  SuccessResponse,
  NotFoundErrorResponse,
  ServerErrorResponse,
  ErrorResponse,
  WithShopIdFromHeader,
} from '@tw/utils/module/api/endpoint';
import { getAllSessionData } from '../../db';
import { assembleConversationHistory } from '../../helpers/conversationHistory';
import type { ConversationTurn } from '../../types';

export type GetSessionRequestQuery = {
  sessionId: string;
};
type GetSessionRequest = WithShopIdFromHeader & GetSessionRequestQuery;

export type GetSessionResponse = {
  sessionId: string;
  shopId: string;
  createdAt?: Date | string | null;
  updatedAt?: Date | string | null;
  currentBranchId?: string | null;
  turns: ConversationTurn[];
};

export async function getSession(
  data: GetSessionRequest,
): Promise<SuccessResponse<GetSessionResponse>> {
  const { sessionId, shopId } = data;

  logger.debug({ sessionId, shopId }, 'Session history request');

  if (!sessionId || !shopId) {
    logger.warn({ sessionId, shopId }, 'Missing required parameters');
    throw new NotFoundErrorResponse('Session ID and Shop ID are required');
  }

  try {
    const { metadata, messages, structure } = await getAllSessionData(sessionId, shopId);

    if (!metadata) {
      logger.warn({ sessionId }, 'Session not found in database');
      throw new NotFoundErrorResponse(`Session ${sessionId} not found`);
    }

    if (metadata.shopId !== shopId) {
      logger.warn(
        { sessionId, requestedShopId: shopId, actualShopId: metadata.shopId },
        'Shop ID mismatch - unauthorized access attempt',
      );
      throw new NotFoundErrorResponse('Session not found');
    }

    const response = assembleConversationHistory(metadata, messages, structure);

    logger.debug(
      {
        sessionId,
        shopId,
        turnCount: response.turns.length,
        messageCount: messages.length,
        structureCount: structure.length,
      },
      'Session history assembled successfully',
    );

    return new SuccessResponse(response);
  } catch (error) {
    if (error instanceof ErrorResponse) {
      throw error;
    }

    logger.error({ error, sessionId, shopId }, 'Failed to get session history');
    throw new ServerErrorResponse('Failed to retrieve session history');
  }
}
