"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleOutputTextDelta = void 0;
const handleOutputTextDelta = (event) => {
    return {
        shouldSend: true,
        transformedEvent: {
            type: 'outputText.delta',
            itemId: event.item_id,
            contentIndex: event.content_index,
            delta: event.delta,
            sequenceNumber: event.sequence_number,
        },
    };
};
exports.handleOutputTextDelta = handleOutputTextDelta;
//# sourceMappingURL=outputText.js.map