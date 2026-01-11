"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleRunItemStreamEvent = void 0;
const utils_1 = require("./utils");
const toolEventBuilder_1 = require("./toolEventBuilder");
function isToolExecutionEndContext(ctx) {
    return ctx?.context_type === 'tool_execution_end';
}
const handleRunItemStreamEvent = async (event, streamConfig) => {
    const ctx = buildEventContext(event);
    if (!ctx)
        return { shouldSend: false };
    if (!(0, utils_1.isAllowedAgent)(ctx.agentCalling)) {
        return { shouldSend: false };
    }
    const rawOutput = event.name === 'tool_output' ? extractRawOutput(event.item) : undefined;
    const result = await (0, toolEventBuilder_1.buildToolEvent)({
        toolName: ctx.toolName,
        callId: ctx.callId,
        agentName: ctx.agentCalling,
        arguments: ctx.baseItem.arguments ?? '',
        item: ctx.baseItem.item,
        rawOutput,
        typedOutput: ctx.typedOutput,
        streamConfig,
    });
    if (!result)
        return { shouldSend: false };
    return { shouldSend: true, transformedEvent: result };
};
exports.handleRunItemStreamEvent = handleRunItemStreamEvent;
function buildBaseItem(event) {
    const { execution_context } = event;
    return {
        item: event.item,
        arguments: event.item.raw_item?.arguments ?? '',
        executionContext: execution_context
            ? {
                contextType: execution_context.context_type,
                agentName: execution_context.agent_name,
                toolName: execution_context.tool_name,
            }
            : undefined,
    };
}
function extractCallId(item) {
    if ('raw_item' in item && item.raw_item) {
        const rawItem = item.raw_item;
        return rawItem.call_id ?? '';
    }
    return '';
}
function buildEventContext(event) {
    const toolName = event?.execution_context?.tool_name;
    const callId = extractCallId(event.item);
    if (!toolName || !callId)
        return null;
    let typedOutput;
    if (isToolExecutionEndContext(event.execution_context)) {
        typedOutput = event.execution_context.typed_output;
    }
    else {
        typedOutput = undefined;
    }
    return {
        baseItem: buildBaseItem(event),
        callId,
        toolName,
        agentCalling: event?.agent_name || event?.execution_context?.agent_name || 'unknown',
        typedOutput,
    };
}
function extractRawOutput(item) {
    if ('raw_item' in item && item.raw_item) {
        const rawItem = item.raw_item;
        return rawItem.output ?? '';
    }
    return '';
}
//# sourceMappingURL=runItemStreamEvent.js.map