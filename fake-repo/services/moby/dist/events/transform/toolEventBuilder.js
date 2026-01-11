"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildToolEvent = buildToolEvent;
exports.buildToolItem = buildToolItem;
const outputFormatters_1 = require("./outputFormatters");
const argumentFormatters_1 = require("./argumentFormatters");
const utils_1 = require("./utils");
/**
 * Core tool event builder - shared between SSE and history paths.
 * Returns null if tool is not allowed.
 */
async function buildToolEvent(input) {
    if (!(0, utils_1.isAllowedName)(input.toolName)) {
        return null;
    }
    const toolArgs = (0, argumentFormatters_1.formatToolArguments)({
        toolName: input.toolName,
        agentName: input.agentName,
        arguments: input.arguments,
    });
    // No output = CallToolEvent (in-progress)
    if (input.rawOutput === undefined) {
        return {
            type: 'CallToolEvent',
            callId: input.callId,
            item: input.item,
            agentCalling: input.agentName,
            toolCalled: toolArgs.toolCalled,
            arguments: toolArgs.arguments,
            parsedArguments: toolArgs.parsedArguments,
        };
    }
    // Has output = ToolOutputEvent
    const { rawOutput, parsedOutput } = await (0, outputFormatters_1.formatToolOutput)({
        toolName: input.toolName,
        agentName: input.agentName,
        output: input.rawOutput,
        typedOutput: input.typedOutput,
        streamConfig: input.streamConfig,
    });
    return {
        type: 'ToolOutputEvent',
        callId: input.callId,
        item: input.item,
        toolCalled: toolArgs.toolCalled,
        agentCalling: input.agentName,
        rawOutput,
        parsedOutput,
    };
}
/**
 * Build RunItemStreamEventEssential item structure.
 * Used by history path to reconstruct item from DB data.
 */
function buildToolItem(params) {
    return {
        type: 'tool_call_item',
        agent: params.agentName,
        raw_item: {
            name: params.toolName,
            call_id: params.callId,
            arguments: params.arguments,
            type: 'function_call',
            id: params.id,
            status: params.status ?? 'completed',
        },
    };
}
//# sourceMappingURL=toolEventBuilder.js.map