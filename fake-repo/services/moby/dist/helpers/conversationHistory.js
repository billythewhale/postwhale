"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.assembleConversationHistory = assembleConversationHistory;
const logger_1 = require("@tw/utils/module/logger");
function safeJsonParse(raw) {
    if (!raw)
        return null;
    try {
        return JSON.parse(raw);
    }
    catch (error) {
        logger_1.logger.warn({ raw, error }, 'Failed to parse JSON payload');
        return null;
    }
}
function buildMessageMap(messageRows) {
    const map = new Map();
    for (const row of messageRows) {
        const messageData = safeJsonParse(row.messageData);
        map.set(row.id, {
            id: row.id,
            sessionId: row.sessionId,
            messageData: messageData || {},
            createdAt: row.createdAt,
        });
    }
    return map;
}
function assembleConversationHistory(metadata, messageRows, structureRows) {
    const currentBranchId = metadata.currentBranchId || 'main';
    const messagesMap = buildMessageMap(messageRows);
    const structureList = structureRows.map((row) => ({
        ...row,
        modelConfig: row.modelConfig ? row.modelConfig : null,
    }));
    const turnsData = new Map();
    const branchInfoMap = new Map();
    const currentTurnByBranch = new Map();
    for (const struct of structureList) {
        const { branchId, isThread, messageType, messageId, globalTurnNumber, parentBranchId, branchedFromTurn, sequenceNumber, toolName, modelConfig, } = struct;
        if (!branchInfoMap.has(branchId)) {
            branchInfoMap.set(branchId, {
                isThread,
                isCurrent: branchId === currentBranchId,
                parentBranchId,
                branchedFromTurn,
            });
        }
        let globalTurn = globalTurnNumber;
        if (messageType === 'user') {
            if (globalTurn !== null && globalTurn !== undefined) {
                currentTurnByBranch.set(branchId, globalTurn);
            }
        }
        else {
            if (globalTurn === null || globalTurn === undefined) {
                globalTurn = currentTurnByBranch.get(branchId);
            }
        }
        if (globalTurn === null || globalTurn === undefined) {
            logger_1.logger.warn({ messageId, branchId }, 'Skipping message without determinable global turn');
            continue;
        }
        if (!turnsData.has(globalTurn)) {
            turnsData.set(globalTurn, new Map());
        }
        const turnBranches = turnsData.get(globalTurn);
        if (!turnBranches.has(branchId)) {
            turnBranches.set(branchId, []);
        }
        const messageRecord = messagesMap.get(messageId);
        if (messageRecord) {
            const event = {
                messageId,
                messageType,
                sequenceNumber,
                messageData: messageRecord.messageData,
                toolName: toolName || null,
                modelConfig: safeJsonParse(modelConfig),
                createdAt: messageRecord.createdAt,
            };
            turnBranches.get(branchId).push(event);
        }
        else {
            logger_1.logger.warn({ messageId }, 'Message not found in messages table');
        }
    }
    const turnsList = [];
    const sortedTurns = Array.from(turnsData.keys()).sort((a, b) => a - b);
    for (const globalTurn of sortedTurns) {
        const branchesInTurn = turnsData.get(globalTurn);
        const branches = [];
        for (const [branchId, events] of branchesInTurn.entries()) {
            const branchInfo = branchInfoMap.get(branchId) ||
                {
                    isThread: false,
                    isCurrent: false,
                };
            events.sort((a, b) => a.sequenceNumber - b.sequenceNumber);
            const branch = {
                branchId,
                isThread: branchInfo.isThread,
                isCurrent: branchInfo.isCurrent,
                fromTurn: branchInfo.branchedFromTurn,
                fromBranch: branchInfo.parentBranchId,
                events,
            };
            branches.push(branch);
        }
        branches.sort((a, b) => {
            if (a.branchId === 'main')
                return -1;
            if (b.branchId === 'main')
                return 1;
            return a.branchId.localeCompare(b.branchId);
        });
        turnsList.push({
            turnNumber: globalTurn,
            branches,
        });
    }
    return {
        sessionId: metadata.sessionId,
        shopId: metadata.shopId,
        createdAt: metadata.createdAt,
        updatedAt: metadata.updatedAt,
        currentBranchId,
        turns: turnsList,
    };
}
//# sourceMappingURL=conversationHistory.js.map