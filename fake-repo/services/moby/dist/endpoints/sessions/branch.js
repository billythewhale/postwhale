"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getBranch = getBranch;
const logger_1 = require("@tw/utils/module/logger");
const endpoint_1 = require("@tw/utils/module/api/endpoint");
const db_1 = require("../../db");
const history_1 = require("../../history");
const workingDir_1 = require("../../utils/workingDir");
async function getBranch(data) {
    const { sessionId, shopId, branchId, workingDir } = data;
    logger_1.logger.debug({ sessionId, shopId, branchId }, 'Session messages request');
    if (!sessionId || !shopId) {
        logger_1.logger.warn({ sessionId, shopId }, 'Missing required parameters');
        throw new endpoint_1.NotFoundErrorResponse('Session ID and Shop ID are required');
    }
    try {
        logger_1.logger.debug({ sessionId, shopId }, 'Fetching session metadata');
        const metadata = await (0, db_1.getSessionMetadata)(sessionId);
        if (!metadata) {
            logger_1.logger.warn({ sessionId }, 'Session not found in database');
            throw new endpoint_1.NotFoundErrorResponse(`Session ${sessionId} not found`);
        }
        if (metadata.shopId !== shopId) {
            logger_1.logger.warn({ sessionId, requestedShopId: shopId, actualShopId: metadata.shopId }, 'Shop ID mismatch - unauthorized access attempt');
            throw new endpoint_1.NotFoundErrorResponse('Session not found');
        }
        const effectiveBranchId = branchId ?? metadata.currentBranchId;
        logger_1.logger.debug({ sessionId, effectiveBranchId, shopId }, 'Fetching messages from DB');
        const messageRows = await (0, db_1.getSessionMessagesByBranch)(sessionId, effectiveBranchId, shopId);
        logger_1.logger.debug({ sessionId, rowCount: messageRows.length }, 'Fetched message rows');
        const effectiveWorkingDir = (0, workingDir_1.getEffectiveWorkingDir)({
            workingDir,
            shopId,
            sessionId,
        }) ?? '';
        logger_1.logger.debug({ sessionId, rowCount: messageRows.length }, 'Transforming history messages');
        const transformedMessages = await (0, history_1.transformHistoryMessages)(messageRows, {
            workingDir: effectiveWorkingDir,
            sessionId,
        });
        logger_1.logger.debug({ sessionId, transformedCount: transformedMessages.length }, 'Transformed messages');
        const messages = transformedMessages.map((msg) => ({
            id: msg.id,
            sessionId: msg.sessionId,
            messageData: msg,
            createdAt: msg.createdAt,
            role: 'role' in msg && msg.role === 'user' ? 'user' : 'assistant',
        }));
        const turns = [];
        let currentTurn = [];
        for (const message of messages) {
            const role = message.messageData?.role;
            if (role === 'user') {
                if (currentTurn.length > 0) {
                    turns.push(currentTurn);
                }
                currentTurn = [message];
            }
            else {
                if (currentTurn.length === 0) {
                    currentTurn = [message];
                }
                else {
                    currentTurn.push(message);
                }
            }
        }
        if (currentTurn.length > 0) {
            turns.push(currentTurn);
        }
        const response = {
            sessionId: sessionId,
            shopId: shopId,
            branchId: effectiveBranchId,
            turns,
            messageCount: messages.length,
        };
        logger_1.logger.debug({ sessionId, shopId, branchId: effectiveBranchId, messageCount: messages.length }, 'Messages retrieved successfully');
        return new endpoint_1.SuccessResponse(response);
    }
    catch (error) {
        if (error instanceof endpoint_1.ErrorResponse) {
            throw error;
        }
        const err = error instanceof Error ? error : new Error(String(error));
        logger_1.logger.error({ err, sessionId, shopId, branchId }, 'Failed to get session messages');
        throw new endpoint_1.ServerErrorResponse('Failed to retrieve messages');
    }
}
//# sourceMappingURL=branch.js.map