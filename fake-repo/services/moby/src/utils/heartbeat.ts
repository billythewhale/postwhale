/**
 * Heartbeat Manager for SSE Stream
 *
 * Handles two responsibilities:
 *
 * 1. Python Health Monitoring
 *    - Detects if the Python AI service (ai-moby) stops responding
 *    - Python sends heartbeats every 15s to Redis
 *    - If no activity for 50s, sends PYTHON_SERVICE_TIMEOUT error to client
 *
 * 2. Gateway Heartbeat to Client
 *    - Sends heartbeat events to client (~20s during active streaming, ~30s during idle)
 *    - Allows client to detect if SSE connection silently died
 *    - Client should timeout at ~60s without heartbeat
 *
 * Usage:
 *   const heartbeat = createHeartbeatManager(taskId);
 *   heartbeat.onPythonActivity();  // Call when Redis data arrives
 *   const result = heartbeat.check();  // Returns events to send + shouldClose
 */
import type { SSEMessage } from '@tw/utils/module/api/endpoint';
import type { Moby } from '@tw/shared-types';
import { logger } from '@tw/utils/module/logger';

// Heartbeat configuration
const PYTHON_HEARTBEAT_TIMEOUT_MS = 50_000; // Detect if Python stops responding (a little more than ~3x Python's 15s heartbeat)
const SSE_HEARTBEAT_INTERVAL_MS = 20_000; // Send heartbeat to client (~20s during active streaming, ~30s during idle)

// Re-export types from shared-types for convenience
export type GatewayHeartbeatEvent = Moby.GatewayHeartbeatEvent;
export type PythonTimeoutErrorEvent = Moby.PythonTimeoutErrorEvent;
export type HeartbeatSSEEvent = GatewayHeartbeatEvent | PythonTimeoutErrorEvent;

type HeartbeatState = {
  lastPythonActivity: number;
  pythonTimedOut: boolean;
  lastHeartbeatSent: number;
};

export type HeartbeatCheckResult = {
  events: SSEMessage<HeartbeatSSEEvent>[];
  shouldClose: boolean;
};

export function createHeartbeatManager(taskId: string) {
  const state: HeartbeatState = {
    lastPythonActivity: Date.now(),
    pythonTimedOut: false,
    lastHeartbeatSent: Date.now(),
  };

  function onPythonActivity() {
    state.lastPythonActivity = Date.now();
  }

  function check(): HeartbeatCheckResult {
    const now = Date.now();
    const timeSinceLastPythonActivity = now - state.lastPythonActivity;
    const timeSinceLastHeartbeat = now - state.lastHeartbeatSent;
    const events: SSEMessage<HeartbeatSSEEvent>[] = [];
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
      logger.warn(
        { taskId, lastActivity: state.lastPythonActivity },
        'Python service not responding - timeout detected',
      );
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
      logger.warn({ taskId }, 'Closing SSE stream due to Python service timeout');
    }

    return { events, shouldClose };
  }

  return {
    onPythonActivity,
    check,
  };
}

export type HeartbeatManager = ReturnType<typeof createHeartbeatManager>;
