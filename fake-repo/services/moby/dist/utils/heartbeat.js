"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createHeartbeatManager = createHeartbeatManager;
const logger_1 = require("@tw/utils/module/logger");
// Heartbeat configuration
const PYTHON_HEARTBEAT_TIMEOUT_MS = 50_000; // Detect if Python stops responding (a little more than ~3x Python's 15s heartbeat)
const SSE_HEARTBEAT_INTERVAL_MS = 20_000; // Send heartbeat to client (~20s during active streaming, ~30s during idle)
function createHeartbeatManager(taskId) {
    const state = {
        lastPythonActivity: Date.now(),
        pythonTimedOut: false,
        lastHeartbeatSent: Date.now(),
    };
    function onPythonActivity() {
        state.lastPythonActivity = Date.now();
    }
    function check() {
        const now = Date.now();
        const timeSinceLastPythonActivity = now - state.lastPythonActivity;
        const timeSinceLastHeartbeat = now - state.lastHeartbeatSent;
        const events = [];
        let shouldClose = false;
        // Check if we need to send a heartbeat to client
        if (timeSinceLastHeartbeat >= SSE_HEARTBEAT_INTERVAL_MS) {
            events.push({
                event: 'heartbeat',
                data: {
                    type: 'heartbeat',
                    source: 'gateway',
                    timestamp: new Date().toISOString(),
                },
            });
            state.lastHeartbeatSent = now;
        }
        // Check if Python timed out (no activity for 50s = something is wrong)
        if (!state.pythonTimedOut && timeSinceLastPythonActivity > PYTHON_HEARTBEAT_TIMEOUT_MS) {
            state.pythonTimedOut = true;
            logger_1.logger.warn({ taskId, lastActivity: state.lastPythonActivity }, 'Python service not responding - timeout detected');
            events.push({
                event: 'error',
                data: {
                    type: 'error',
                    code: 'PYTHON_SERVICE_TIMEOUT',
                    message: 'AI service not responding. Please retry your question.',
                    timestamp: new Date().toISOString(),
                },
            });
            shouldClose = true;
            logger_1.logger.warn({ taskId }, 'Closing SSE stream due to Python service timeout');
        }
        return { events, shouldClose };
    }
    return {
        onPythonActivity,
        check,
    };
}
//# sourceMappingURL=heartbeat.js.map