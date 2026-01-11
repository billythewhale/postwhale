"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.transformReasoningMessages = transformReasoningMessages;
const types_1 = require("./types");
function isReasoningMessage(row) {
    return row.messageType === 'reasoning' || row.messageData?.type === 'reasoning';
}
function transformReasoningMessages(messages, sessionId) {
    const results = [];
    for (const row of messages) {
        if (!isReasoningMessage(row))
            continue;
        const transformed = transformSingleReasoningMessage(row, sessionId);
        results.push(...transformed);
    }
    return results;
}
function transformSingleReasoningMessage(row, sessionId) {
    const data = row.messageData;
    const reasoningId = data.id;
    const summary = data.summary ?? [];
    if (summary.length === 0) {
        return [];
    }
    return summary.map((item, index) => ({
        type: 'reasoningSummaryPart.done',
        id: `${reasoningId}-${index}`,
        sessionId,
        createdAt: row.createdAt,
        item: {
            agentName: types_1.DEFAULT_AGENT_NAME,
            itemId: reasoningId,
            summaryIndex: index,
            part: {
                text: item.text,
                type: 'summary_text',
            },
        },
    }));
}
//# sourceMappingURL=reasoningTransformer.js.map