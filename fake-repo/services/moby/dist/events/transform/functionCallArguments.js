"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleFunctionCallArgumentsDone = void 0;
const handleFunctionCallArgumentsDone = (event) => {
    return {
        shouldSend: true,
        transformedEvent: {
            type: 'functionCall.arguments.done',
            item: {
                itemId: event.item_id,
                name: event.name,
                arguments: event.arguments,
                agentName: event.agent_name,
            },
        },
    };
};
exports.handleFunctionCallArgumentsDone = handleFunctionCallArgumentsDone;
//# sourceMappingURL=functionCallArguments.js.map