"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.transformHistoryMessages = transformHistoryMessages;
const toolTransformer_1 = require("./toolTransformer");
const reasoningTransformer_1 = require("./reasoningTransformer");
function parseDbRow(row, sessionId) {
    let parsedMessageData;
    try {
        parsedMessageData =
            typeof row.messageData === 'string' ? JSON.parse(row.messageData) : row.messageData;
    }
    catch {
        parsedMessageData = {};
    }
    return {
        id: row.id,
        sessionId,
        messageData: parsedMessageData,
        createdAt: typeof row.createdAt === 'string' ? row.createdAt : row.createdAt.toISOString(),
        messageType: row.messageType,
    };
}
function isUserMessage(row) {
    return row.messageType === 'user' || row.messageData?.role === 'user';
}
function isAssistantMessage(row) {
    return (row.messageType === 'assistant' ||
        (row.messageData?.role === 'assistant' && row.messageData?.type === 'message'));
}
function isReasoningMessage(row) {
    return row.messageType === 'reasoning' || row.messageData?.type === 'reasoning';
}
function isFunctionCallMessage(row) {
    return row.messageType === 'function_call' || row.messageData?.type === 'function_call';
}
function transformUserMessage(row, sessionId) {
    const data = row.messageData;
    return {
        id: row.id,
        sessionId,
        createdAt: row.createdAt,
        role: 'user',
        content: data.content,
    };
}
function transformAssistantMessage(row, sessionId) {
    const data = row.messageData;
    return {
        id: data.id ?? row.id,
        sessionId,
        createdAt: row.createdAt,
        role: 'assistant',
        type: 'message',
        content: data.content,
        status: data.status,
    };
}
async function transformHistoryMessages(dbRows, config) {
    const rawMessages = dbRows.map((row) => parseDbRow(row, config.sessionId));
    // Pre-transform tool calls and reasoning, indexed by ID for O(1) lookup
    const toolPairs = (0, toolTransformer_1.pairToolCalls)(rawMessages);
    const toolOutputEvents = await (0, toolTransformer_1.transformToolCalls)(toolPairs, config);
    const toolEventsByCallId = new Map(toolOutputEvents.map((e) => [e.callId, e]));
    const reasoningMessages = (0, reasoningTransformer_1.transformReasoningMessages)(rawMessages, config.sessionId);
    const reasoningByItemId = new Map();
    for (const msg of reasoningMessages) {
        const existing = reasoningByItemId.get(msg.item.itemId) ?? [];
        existing.push(msg);
        reasoningByItemId.set(msg.item.itemId, existing);
    }
    // Track which IDs we've already emitted (each should appear once)
    const emittedReasoningIds = new Set();
    const emittedCallIds = new Set();
    const results = [];
    for (const row of rawMessages) {
        if (isUserMessage(row)) {
            results.push(transformUserMessage(row, config.sessionId));
            continue;
        }
        if (isAssistantMessage(row)) {
            results.push(transformAssistantMessage(row, config.sessionId));
            continue;
        }
        if (isReasoningMessage(row)) {
            const reasoningId = row.messageData?.id;
            if (!reasoningId || emittedReasoningIds.has(reasoningId))
                continue;
            const messages = reasoningByItemId.get(reasoningId);
            if (messages) {
                results.push(...messages);
                emittedReasoningIds.add(reasoningId);
            }
            continue;
        }
        if (isFunctionCallMessage(row)) {
            const callId = row.messageData?.call_id;
            if (!callId || emittedCallIds.has(callId))
                continue;
            const toolEvent = toolEventsByCallId.get(callId);
            if (toolEvent) {
                results.push(toolEvent);
                emittedCallIds.add(callId);
            }
        }
    }
    return results;
}
//# sourceMappingURL=transformer.js.map