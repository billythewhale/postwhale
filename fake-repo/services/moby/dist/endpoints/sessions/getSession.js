"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSession = getSession;
const logger_1 = require("@tw/utils/module/logger");
const endpoint_1 = require("@tw/utils/module/api/endpoint");
const db_1 = require("../../db");
const conversationHistory_1 = require("../../helpers/conversationHistory");
async function getSession(data) {
    const { sessionId, shopId } = data;
    logger_1.logger.debug({ sessionId, shopId }, 'Session history request');
    if (!sessionId || !shopId) {
        logger_1.logger.warn({ sessionId, shopId }, 'Missing required parameters');
        throw new endpoint_1.NotFoundErrorResponse('Session ID and Shop ID are required');
    }
    try {
        const { metadata, messages, structure } = await (0, db_1.getAllSessionData)(sessionId, shopId);
        if (!metadata) {
            logger_1.logger.warn({ sessionId }, 'Session not found in database');
            throw new endpoint_1.NotFoundErrorResponse(`Session ${sessionId} not found`);
        }
        if (metadata.shopId !== shopId) {
            logger_1.logger.warn({ sessionId, requestedShopId: shopId, actualShopId: metadata.shopId }, 'Shop ID mismatch - unauthorized access attempt');
            throw new endpoint_1.NotFoundErrorResponse('Session not found');
        }
        const response = (0, conversationHistory_1.assembleConversationHistory)(metadata, messages, structure);
        logger_1.logger.debug({
            sessionId,
            shopId,
            turnCount: response.turns.length,
            messageCount: messages.length,
            structureCount: structure.length,
        }, 'Session history assembled successfully');
        return new endpoint_1.SuccessResponse(response);
    }
    catch (error) {
        if (error instanceof endpoint_1.ErrorResponse) {
            throw error;
        }
        logger_1.logger.error({ error, sessionId, shopId }, 'Failed to get session history');
        throw new endpoint_1.ServerErrorResponse('Failed to retrieve session history');
    }
}
//# sourceMappingURL=getSession.js.map