"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.collectTurns = collectTurns;
function collectTurns(messages, parentSessionId) {
    const userMessages = messages
        .filter((m) => m.messageData?.role === 'user' && m.sessionId === parentSessionId)
        .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
    if (userMessages.some((m) => !m.taskId)) {
        return collectTurnsByTimestampAndSessionId(messages, parentSessionId);
    }
    return collectTurnsByTaskId(messages, userMessages.map((m) => m.taskId));
}
function collectTurnsByTaskId(messages, taskIds) {
    return taskIds.map((taskId) => {
        return messages
            .filter((m) => m.taskId === taskId)
            .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
    });
}
function collectTurnsByTimestampAndSessionId(messages, parentSessionId) {
    const turns = [];
    let currentTurn = [];
    const sortedMessages = messages.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
    for (const message of sortedMessages) {
        const role = message.messageData?.role;
        const sessionId = message.sessionId;
        if (role === 'user' && sessionId === parentSessionId) {
            if (currentTurn.length > 0) {
                turns.push(currentTurn);
            }
            currentTurn = [message];
        }
        else {
            currentTurn.push(message);
        }
    }
    if (currentTurn.length > 0) {
        turns.push(currentTurn);
    }
    return turns;
}
//# sourceMappingURL=collectTurns.js.map