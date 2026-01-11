"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleResponseOutputItemDone = exports.handleResponseOutputItemAdded = void 0;
const handleResponseOutputItemAdded = (event) => {
    switch (event.item.type) {
        case 'reasoning':
            return sendReasoningAdded(event);
        case 'message':
            return sendAssistantMessage(event);
        default:
            return { shouldSend: false };
    }
};
exports.handleResponseOutputItemAdded = handleResponseOutputItemAdded;
const handleResponseOutputItemDone = (event) => {
    switch (event.item.type) {
        case 'reasoning':
            return sendReasoningDone(event);
        default:
            return { shouldSend: false };
    }
};
exports.handleResponseOutputItemDone = handleResponseOutputItemDone;
function sendReasoningAdded(event) {
    return {
        shouldSend: true,
        transformedEvent: {
            type: 'reasoningItem.added',
            item: createReasoningItem(event),
        },
    };
}
function sendReasoningDone(event) {
    return {
        shouldSend: true,
        transformedEvent: {
            type: 'reasoningItem.done',
            item: createReasoningItem(event),
        },
    };
}
function sendAssistantMessage(event) {
    return {
        shouldSend: true,
        transformedEvent: {
            type: 'assistantMessage.added',
            item: createAssistantMessageEvent(event),
        },
    };
}
function createReasoningItem(event) {
    return {
        id: event.item.id,
        type: event.item.type,
        summary: event.item.summary,
        status: event.item.status,
    };
}
function createAssistantMessageEvent(event) {
    return {
        id: event.item.id,
        type: event.item.type,
        role: event.item.role,
        content: event.item.content,
        status: event.item.status,
    };
}
//# sourceMappingURL=outputItem.js.map