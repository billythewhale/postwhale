"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleEvent = handleEvent;
const turnStatus_1 = require("./transform/turnStatus");
const outputItem_1 = require("./transform/outputItem");
const outputText_1 = require("./transform/outputText");
const runItemStreamEvent_1 = require("./transform/runItemStreamEvent");
const functionCallArguments_1 = require("./transform/functionCallArguments");
const reasoningSummary_1 = require("./transform/reasoningSummary");
/*
 *  If handler returns:
 *    { shouldSend: true, transformedEvent: {...} }
 *      -> send transformedEvent to client
 *    { shouldSend: true }
 *      -> send original event to client
 *    { shouldSend: false }
 *      -> do not send anything to client
 *
 *  Event types that don't match a key in this map will be IGNORED.
 */
const eventHandlers = {
    turn_status: turnStatus_1.handleTurnStatus,
    'response.output_item.added': outputItem_1.handleResponseOutputItemAdded,
    'response.output_item.done': outputItem_1.handleResponseOutputItemDone,
    'response.output_text.delta': outputText_1.handleOutputTextDelta,
    run_item_stream_event: runItemStreamEvent_1.handleRunItemStreamEvent,
    'response.reasoning_summary_part.added': reasoningSummary_1.handleReasoningSummaryPartAdded,
    'response.reasoning_summary_part.done': reasoningSummary_1.handleReasoningSummaryPartDone,
    'response.function_call_arguments.done': functionCallArguments_1.handleFunctionCallArgumentsDone,
};
async function handleEvent(event, streamConfig) {
    return eventHandlers[event.type]?.(event, streamConfig);
}
__exportStar(require("./transform/turnStatus"), exports);
//# sourceMappingURL=index.js.map