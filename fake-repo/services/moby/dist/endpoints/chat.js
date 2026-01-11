"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.chatEndpoint = chatEndpoint;
const ai_moby_client_1 = require("@tw/ai-moby-client");
const logger_1 = require("@tw/utils/module/logger");
const services_1 = require("@tw/types/module/services");
const IndustryType_1 = require("@tw/types/module/types/IndustryType");
const endpoint_1 = require("@tw/utils/module/api/endpoint");
const callServiceEndpoint_1 = require("@tw/utils/module/callServiceEndpoint");
const dcl_1 = require("@tw/utils/module/dcl");
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
            // Shmuel moshe sent me this: https://triplewhale.atlassian.net/browse/TW-25972
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
            sessionId: aiMobyResponse.sessions_config.session_id,
            workingDir: aiMobyResponse.sessions_config.work_dir,
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
function validateMsp(msp) {
    if (!(msp in services_1.SALES_PLATFORMS)) {
        throw new endpoint_1.BadRequestErrorResponse(`Invalid msp value: ${msp}`);
    }
    return msp;
}
async function callAIMoby(params) {
    const { userId, shopId, message: initialMessage, configs, sessionId } = params;
    let message = initialMessage;
    const shortcodeRegex = /(?:^|\s)\/[A-Za-z0-9_-]+/;
    if (shortcodeRegex.test(message)) {
        try {
            const response = await (0, callServiceEndpoint_1.callServiceEndpoint)('willy', 'skills/replace-shortcodes', {
                message,
                userId,
                shopId,
            });
            message = response.data?.processedMessage ?? initialMessage;
        }
        catch (error) {
            logger_1.logger.warn({ error, shopId, userId }, 'Failed to replace skill shortcodes, using original message');
        }
    }
    const { shopUrl } = await dcl_1.shopDataDcl.fetchMethod({ shopId });
    try {
        const { data } = await ai_moby_client_1.aiMoby.chatMain({
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
//# sourceMappingURL=chat.js.map