"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleReasoningSummaryPartDone = exports.handleReasoningSummaryPartAdded = void 0;
const handleReasoningSummaryPartAdded = (event) => {
    return {
        shouldSend: true,
        transformedEvent: {
            type: 'reasoningSummaryPart.added',
            item: {
                itemId: event.item_id,
                summaryIndex: event.summary_index,
                part: event.part,
                agentName: event.agent_name,
            },
        },
    };
};
exports.handleReasoningSummaryPartAdded = handleReasoningSummaryPartAdded;
const handleReasoningSummaryPartDone = (event) => {
    return {
        shouldSend: true,
        transformedEvent: {
            type: 'reasoningSummaryPart.done',
            item: {
                agentName: event.agent_name,
                itemId: event.item_id,
                summaryIndex: event.summary_index,
                part: event.part,
            },
        },
    };
};
exports.handleReasoningSummaryPartDone = handleReasoningSummaryPartDone;
//# sourceMappingURL=reasoningSummary.js.map