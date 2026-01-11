import { aiMoby, type ChatMainResponse } from '@tw/ai-moby-client';
import { logger } from '@tw/utils/module/logger';
import type { ChatRequest as ChatRequestBody, ChatResponse } from '@tw/shared-types';
import { SALES_PLATFORMS, type SalesPlatform } from '@tw/types/module/services';
import { IndustryTypesRoles, type IndustryTypes } from '@tw/types/module/types/IndustryType';
import {
  BadRequestErrorResponse,
  NotFoundErrorResponse,
  ServerErrorResponse,
  SuccessResponse,
  UnauthorizedErrorResponse,
  type WithShopIdFromHeader,
  type WithUser,
} from '@tw/utils/module/api/endpoint';
import { callServiceEndpoint } from '@tw/utils/module/callServiceEndpoint';
import { shopDataDcl } from '@tw/utils/module/dcl';

import { getSessionMetadata } from '../db';
import type { FirebaseUser } from '@tw/types';

type ChatRequest = WithUser & WithShopIdFromHeader & ChatRequestBody;

export async function chatEndpoint(data: ChatRequest) {
  try {
    const { user, shopId, message, sessionId, configs: configs } = data;
    const userId = (user as FirebaseUser)?.user_id;

    if (!userId) {
      throw new UnauthorizedErrorResponse('user token is missing');
    }

    if (!shopId) {
      throw new UnauthorizedErrorResponse('shopId header is missing');
    }

    if (!message) {
      throw new BadRequestErrorResponse('message is required');
    }

    if (sessionId) {
      const session = await getSessionMetadata(sessionId);
      if (!session) {
        logger.warn({ sessionId, userId }, 'Session not found in database');
        throw new NotFoundErrorResponse('Session not found', { sessionId });
      }
      // TODO: create real authorization logic, check if user has access to this shop conversations - and that should be good enough
      // Shmuel moshe sent me this: https://triplewhale.atlassian.net/browse/TW-25972
    }

    const aiMobyResponse = await callAIMoby({
      userId,
      shopId,
      message,
      configs: configs,
      sessionId,
    });

    const response: ChatResponse = {
      taskId: aiMobyResponse.tasks_config.task_id,
      sessionId: aiMobyResponse.sessions_config.session_id,
      workingDir: aiMobyResponse.sessions_config.work_dir,
    };

    return new SuccessResponse(response);
  } catch (err) {
    logger.error({ err }, 'Chat endpoint error');
    throw new ServerErrorResponse('Unknown Moby Error');
  }
}

type CallAiMobyParams = {
  userId: string;
  shopId: string;
} & Pick<ChatRequestBody, 'message' | 'configs' | 'sessionId'>;

function validateIndustry(industry: string): IndustryTypes {
  if (IndustryTypesRoles.includes(industry as IndustryTypes)) {
    return industry as IndustryTypes;
  }
  return 'other';
}

function validateMsp(msp: string): SalesPlatform {
  if (!(msp in SALES_PLATFORMS)) {
    throw new BadRequestErrorResponse(`Invalid msp value: ${msp}`);
  }
  return msp as SalesPlatform;
}

async function callAIMoby(params: CallAiMobyParams): Promise<ChatMainResponse> {
  const { userId, shopId, message: initialMessage, configs, sessionId } = params;
  let message = initialMessage;

  const shortcodeRegex = /(?:^|\s)\/[A-Za-z0-9_-]+/;
  if (shortcodeRegex.test(message)) {
    try {
      const response = await callServiceEndpoint('willy', 'skills/replace-shortcodes', {
        message,
        userId,
        shopId,
      });
      message = response.data?.processedMessage ?? initialMessage;
    } catch (error) {
      logger.warn(
        { error, shopId, userId },
        'Failed to replace skill shortcodes, using original message',
      );
    }
  }

  const { shopUrl } = await shopDataDcl.fetchMethod({ shopId });
  try {
    const { data } = await aiMoby.chatMain({
      user_config: {
        user_id: userId,
      },
      shop_config: {
        shop_url: shopUrl ?? null,
        start_of_week_day: 0,
        shop_id: shopId,
        country_code: 'US', // TODO: Not sure where to get this from, but it's required
        industry: validateIndustry(configs.industry),
        msp: validateMsp(configs.msp),
        is_pixel_installed: configs.pixelActive,
        has_pixel_access: configs.pixelActive,
        currency: configs.currency ?? 'USD',
        timezone: configs.timezone ?? 'America/New_York',
      },
      input_config: {
        user_message: message,
      },
      stream: true,
      sessions_config: sessionId
        ? {
            session_id: sessionId,
          }
        : undefined,
    });

    return data;
  } catch (error: any) {
    logger.error('Failed to call ai-moby', {
      error: error.message,
      details: error.response?.data?.details,
      status: error.response?.status,
      endpoint: '/chat/main',
      sessionId,
    });
    throw error;
  }
}
