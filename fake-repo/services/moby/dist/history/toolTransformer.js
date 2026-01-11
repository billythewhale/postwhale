"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.pairToolCalls = pairToolCalls;
exports.transformToolCalls = transformToolCalls;
const types_1 = require("./types");
const toolEventBuilder_1 = require("../events/transform/toolEventBuilder");
const logger_1 = require("@tw/utils/module/logger");
function isFunctionCall(row) {
    return row.messageType === 'function_call' || row.messageData?.type === 'function_call';
}
function isFunctionCallOutput(row) {
    return (row.messageType === 'function_call_output' || row.messageData?.type === 'function_call_output');
}
function extractCallId(row) {
    return row.messageData?.call_id ?? null;
}
function pairToolCalls(messages) {
    const callMap = new Map();
    const getOrCreatePair = (callId) => {
        let pair = callMap.get(callId);
        if (!pair) {
            pair = { functionCall: null, functionCallOutput: null };
            callMap.set(callId, pair);
        }
        return pair;
    };
    for (const row of messages) {
        const callId = extractCallId(row);
        if (!callId)
            continue;
        const pair = getOrCreatePair(callId);
        if (isFunctionCall(row)) {
            pair.functionCall = row;
        }
        else if (isFunctionCallOutput(row)) {
            pair.functionCallOutput = row;
        }
    }
    // Filter to pairs that have a function call (drop orphaned outputs)
    return Array.from(callMap.values()).filter((pair) => pair.functionCall !== null);
}
async function transformToolCalls(pairs, config) {
    const results = [];
    for (const pair of pairs) {
        const transformed = await transformSingleToolCall(pair, config);
        if (transformed) {
            results.push(transformed);
        }
    }
    return results;
}
function tryParseJson(str) {
    try {
        return JSON.parse(str);
    }
    catch {
        return undefined;
    }
}
async function transformSingleToolCall(pair, config) {
    const callData = pair.functionCall.messageData;
    const callId = callData.call_id;
    const toolName = callData.name;
    try {
        const agentName = types_1.DEFAULT_AGENT_NAME;
        const item = (0, toolEventBuilder_1.buildToolItem)({
            toolName,
            callId,
            arguments: callData.arguments ?? '',
            agentName,
            id: callData.id,
            status: callData.status,
        });
        const rawOutput = pair.functionCallOutput
            ? pair.functionCallOutput.messageData.output
            : undefined;
        const typedOutput = rawOutput ? tryParseJson(rawOutput) : undefined;
        const result = await (0, toolEventBuilder_1.buildToolEvent)({
            toolName,
            callId,
            agentName,
            arguments: callData.arguments ?? '',
            item,
            rawOutput,
            typedOutput,
            streamConfig: { workingDir: config.workingDir },
        });
        if (!result)
            return null;
        return {
            ...result,
            id: callId,
            sessionId: config.sessionId,
            createdAt: pair.functionCall.createdAt,
        };
    }
    catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        logger_1.logger.error({ err, sessionId: config.sessionId, callId, toolName }, 'Failed to transform tool call');
        throw error;
    }
}
//# sourceMappingURL=toolTransformer.js.map