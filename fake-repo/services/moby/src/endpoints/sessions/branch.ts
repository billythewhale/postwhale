import { logger } from '@tw/utils/module/logger';
import {
  SuccessResponse,
  NotFoundErrorResponse,
  ServerErrorResponse,
  ErrorResponse,
  WithShopIdFromHeader,
} from '@tw/utils/module/api/endpoint';
import { SessionBranchResponse, SessionBranchMessage } from '@tw/shared-types';
import { getSessionMetadata, getSessionMessagesByBranch } from '../../db';
import { transformHistoryMessages } from '../../history';
import { getEffectiveWorkingDir } from '../../utils/workingDir';

export type GetBranchRequestQuery = {
  sessionId: string;
  branchId?: string;
  workingDir?: string;
};

type GetBranchRequest = WithShopIdFromHeader & GetBranchRequestQuery;

export async function getBranch(
  data: GetBranchRequest,
): Promise<SuccessResponse<SessionBranchResponse>> {
  const { sessionId, shopId, branchId, workingDir } = data;

  logger.debug({ sessionId, shopId, branchId }, 'Session messages request');

  if (!sessionId || !shopId) {
    logger.warn({ sessionId, shopId }, 'Missing required parameters');
    throw new NotFoundErrorResponse('Session ID and Shop ID are required');
  }

  try {
    logger.debug({ sessionId, shopId }, 'Fetching session metadata');
    const metadata = await getSessionMetadata(sessionId);

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

    const effectiveBranchId = branchId ?? metadata.currentBranchId;

    logger.debug({ sessionId, effectiveBranchId, shopId }, 'Fetching messages from DB');
    const messageRows = await getSessionMessagesByBranch(sessionId, effectiveBranchId, shopId);
    logger.debug({ sessionId, rowCount: messageRows.length }, 'Fetched message rows');

    const effectiveWorkingDir =
      getEffectiveWorkingDir({
        workingDir,
        shopId,
        sessionId,
      }) ?? '';

    logger.debug({ sessionId, rowCount: messageRows.length }, 'Transforming history messages');
    const transformedMessages = await transformHistoryMessages(messageRows, {
      workingDir: effectiveWorkingDir,
      sessionId,
    });
    logger.debug(
      { sessionId, transformedCount: transformedMessages.length },
      'Transformed messages',
    );

    const messages: SessionBranchMessage[] = transformedMessages.map((msg) => ({
      id: msg.id,
      sessionId: msg.sessionId,
      messageData: msg as Record<string, any>,
      createdAt: msg.createdAt,
      role: 'role' in msg && msg.role === 'user' ? 'user' : 'assistant',
    }));

    const turns: SessionBranchMessage[][] = [];
    let currentTurn: SessionBranchMessage[] = [];

    for (const message of messages) {
      const role = message.messageData?.role;

      if (role === 'user') {
        if (currentTurn.length > 0) {
          turns.push(currentTurn);
        }
        currentTurn = [message];
      } else {
        if (currentTurn.length === 0) {
          currentTurn = [message];
        } else {
          currentTurn.push(message);
        }
      }
    }

    if (currentTurn.length > 0) {
      turns.push(currentTurn);
    }

    const response: SessionBranchResponse = {
      sessionId: sessionId,
      shopId: shopId,
      branchId: effectiveBranchId,
      turns,
      messageCount: messages.length,
    };

    logger.debug(
      { sessionId, shopId, branchId: effectiveBranchId, messageCount: messages.length },
      'Messages retrieved successfully',
    );

    return new SuccessResponse(response);
  } catch (error) {
    if (error instanceof ErrorResponse) {
      throw error;
    }
    const err = error instanceof Error ? error : new Error(String(error));
    logger.error({ err, sessionId, shopId, branchId }, 'Failed to get session messages');
    throw new ServerErrorResponse('Failed to retrieve messages');
  }
}
