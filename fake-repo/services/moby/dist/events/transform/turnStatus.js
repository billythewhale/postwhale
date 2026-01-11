"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleTurnStatus = void 0;
const handleTurnStatus = (event) => {
    return {
        shouldSend: true,
        transformedEvent: {
            type: 'turnStatus',
            status: event.status,
        },
    };
};
exports.handleTurnStatus = handleTurnStatus;
//# sourceMappingURL=turnStatus.js.map