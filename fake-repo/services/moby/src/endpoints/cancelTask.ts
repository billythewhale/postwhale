import { callServiceEndpoint } from '@tw/utils/module/callServiceEndpoint';
import { logger } from '@tw/utils/module/logger';
import type { CancelTaskResponse } from '@tw/shared-types';
import type { CancelTaskResponse as AiMobyCancelTaskResponse } from '@tw/ai-moby-client';
import {
  BadRequestErrorResponse,
  ServerErrorResponse,
  SuccessResponse,
  UnauthorizedErrorResponse,
  type WithShopIdFromHeader,
  type WithUser,
} from '@tw/utils/module/api/endpoint';
import type { FirebaseUser } from '@tw/types';

type CancelTaskEndpointRequest = WithUser &
  WithShopIdFromHeader & {
    taskId: string;
    mode?: 'immediate' | 'after_turn';
  };

export async function cancelTaskEndpoint(data: CancelTaskEndpointRequest) {
  const { user, shopId, taskId, mode = 'after_turn' } = data;
  const userId = (user as FirebaseUser)?.user_id;

  if (!userId) {
    throw new UnauthorizedErrorResponse('user token is missing');
  }

  if (!shopId) {
    throw new UnauthorizedErrorResponse('shopId header is missing');
  }

  if (!taskId) {
    throw new BadRequestErrorResponse('taskId is required');
  }

  try {
    const { data: aiMobyResponse } = await callServiceEndpoint<AiMobyCancelTaskResponse>(
      'ai-moby',
      `tasks/cancel/${taskId}`,
      undefined,
      { method: 'POST', params: { mode } },
    );

    const response: CancelTaskResponse = {
      taskId: aiMobyResponse.task_id,
      status: aiMobyResponse.status,
      wasCancelled: aiMobyResponse.status === 'cancelled',
    };

    return new SuccessResponse(response);
  } catch (err: any) {
    logger.error({ err, taskId, shopId }, 'Cancel task endpoint error');

    if (err.response?.status === 404) {
      throw new BadRequestErrorResponse('Task not found or expired');
    }

    throw new ServerErrorResponse('Failed to cancel task');
  }
}
