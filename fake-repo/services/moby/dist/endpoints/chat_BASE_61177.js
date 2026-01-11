"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = chatEndpoint;
const ai_moby_client_1 = require("@tw/ai-moby-client");
const logger_1 = require("@tw/utils/module/logger");
const IndustryType_1 = require("@tw/types/module/types/IndustryType");
const endpoint_1 = require("@tw/utils/module/api/endpoint");
const db_1 = require("../db");
async function chatEndpoint(data) {
    try {
        const { user, shopId, message, sessionId, configs: configs } = data;
        const userId = user?.user_id;
        if (!userId) {
            throw new endpoint_1.UnauthorizedErrorResponse('user token is missing');
        }
        if (!shopId) {
            throw new endpoint_1.UnauthorizedErrorResponse('shopId header is missing');
        }
        if (!message) {
            throw new endpoint_1.BadRequestErrorResponse('message is required');
        }
        if (sessionId) {
            const session = await (0, db_1.getSessionMetadata)(sessionId);
            if (!session) {
                logger_1.logger.warn({ sessionId, userId }, 'Session not found in database');
                throw new endpoint_1.NotFoundErrorResponse('Session not found', { sessionId });
            }
            // TODO: create real authorization logic, check if user has access to this shop conversations - and that should be good enough
        }
        const aiMobyResponse = await callAIMoby({
            userId,
            shopId,
            message,
            configs: configs,
            sessionId,
        });
        const response = {
            taskId: aiMobyResponse.tasks_config.task_id,
        };
        return new endpoint_1.SuccessResponse(response);
    }
    catch (err) {
        logger_1.logger.error({ err }, 'Chat endpoint error');
        throw new endpoint_1.ServerErrorResponse('Unknown Moby Error');
    }
}
function validateIndustry(industry) {
    if (IndustryType_1.IndustryTypesRoles.includes(industry)) {
        return industry;
    }
    return 'other';
}
/**
 * Call ai-moby service with chat message
 *
 * @param params - Chat parameters
 * @returns Promise<ChatMainResponse>
 */
async function callAIMoby(params) {
    const { userId, shopId, message, configs: configs, sessionId } = params;
    try {
        const { data } = await ai_moby_client_1.aiMoby.chatMain({
            user_config: {
                user_id: userId,
            },
            shop_config: {
                shop_id: shopId,
                country_code: 'US', // TODO: Not sure where to get this from, but it's required
                industry: validateIndustry(configs.industry),
                msp: configs.msp,
            },
            input_config: {
                user_message: message,
            },
            sessions_config: sessionId
                ? {
                    session_id: sessionId,
                }
                : undefined,
        });
        return data;
    }
    catch (error) {
        logger_1.logger.error('Failed to call ai-moby', {
            error: error.message,
            details: error.response?.data?.details,
            status: error.response?.status,
            endpoint: '/chat/main',
            sessionId,
        });
        throw error;
    }
}
//# sourceMappingURL=chat_BASE_61177.js.map