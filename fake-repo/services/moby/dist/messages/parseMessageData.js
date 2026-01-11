"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseMessageData = parseMessageData;
const logger_1 = require("@tw/utils/module/logger");
function parseMessageData(rows) {
    return rows.map((row) => {
        let parsedMessageData;
        try {
            parsedMessageData =
                typeof row.messageData === 'string' ? JSON.parse(row.messageData) : row.messageData;
        }
        catch (error) {
            logger_1.logger.warn({ messageId: row.id, error }, 'Failed to parse message_data JSON');
            parsedMessageData = {};
        }
        return {
            id: row.id,
            sessionId: row.sessionId,
            taskId: row.taskId,
            messageData: parsedMessageData,
            createdAt: new Date(row.createdAt),
        };
    });
}
//# sourceMappingURL=parseMessageData.js.map