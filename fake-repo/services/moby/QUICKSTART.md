# Moby Service - Quick Start Guide

## Prerequisites

1. **Redis** must be running locally or accessible remotely
2. **Node.js** v22+ installed
3. **tw CLI** installed (`npm install -g @tw/cli` or similar)

## Running the Service

### Option 1: Using `tw up` (Recommended)

```bash
# From the project root
REDIS_HOST=localhost tw up moby
```

This will:

- Build the service automatically
- Start the service with hot reload
- Set up the Redis consumer
- Make endpoints available at `http://localhost:8080`

### Option 2: Using npm scripts

```bash
# Navigate to the service directory
cd backend/services/moby

# Build the service
npm run build

# Start the service
REDIS_HOST=localhost npm start
```

### Option 3: Development mode with nodemon

```bash
cd backend/services/moby

# Run in dev mode (auto-reload on file changes)
REDIS_HOST=localhost npm run dev
```

## Environment Variables

| Variable     | Required | Description                      | Example                   |
| ------------ | -------- | -------------------------------- | ------------------------- |
| `REDIS_HOST` | **Yes**  | Redis server hostname            | `localhost` or `10.0.0.5` |
| `PORT`       | No       | HTTP server port (default: 8080) | `8080`                    |

## Available Endpoints

Once running, the service exposes:

### 1. SSE Streaming Endpoint

```
GET /stream/:sessionId
```

Opens a Server-Sent Events connection for real-time chat streaming.

**Example:**

```bash
curl -N http://localhost:8080/stream/test-session-123
```

### 2. Test Publish Endpoint

```
POST /test/publish
```

Publishes test messages to Redis stream for testing the SSE flow.

**Example:**

```bash
curl -X POST http://localhost:8080/test/publish \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "test-session-123",
    "conversationId": "test-conv-456",
    "eventType": "text_chunk",
    "data": {
      "content": "Hello World!",
      "index": 0
    }
  }'
```

## Quick Test

### Terminal 1: Open SSE Connection

```bash
curl -N http://localhost:8080/stream/my-test-session
```

You should see:

```
data: {"type":"connected","sessionId":"my-test-session"}
```

### Terminal 2: Send Test Message

```bash
curl -X POST http://localhost:8080/test/publish \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "my-test-session",
    "conversationId": "test-conv",
    "eventType": "text_chunk",
    "data": {
      "content": "Testing SSE streaming!",
      "index": 0
    }
  }'
```

### Terminal 1: Verify Output

You should immediately see in Terminal 1:

```
event: text_chunk
data: {"content":"Testing SSE streaming!","index":0,"conversationId":"test-conv","timestamp":"1737123456789"}
```

## Logs to Watch For

### Successful Startup

```
✅ Redis stream consumer initialized successfully
✅ Redis stream consumer started successfully
✅ SSE connection established
```

### During Operation

```
✅ Processing Redis event
✅ Event forwarded to SSE
✅ Message acknowledged
```

## Troubleshooting

### Service won't start

**Error:** `REDIS_HOST is required for Redis stream consumer`

- **Solution:** Make sure you're passing `REDIS_HOST=localhost` before the command

**Error:** `Cannot connect to Redis`

- **Solution:** Ensure Redis is running:

  ```bash
  # Start Redis locally
  redis-server

  # Or via Docker
  docker run -p 6379:6379 redis:7
  ```

### Build errors

**Error:** TypeScript compilation errors

- **Solution:** Run `npm install` to ensure dependencies are installed:
  ```bash
  cd backend/services/moby
  npm install
  npm run build
  ```

### SSE connection closes immediately

- Check that the endpoint is correct: `/stream/:sessionId`
- Verify the service is running and listening on the expected port
- Check service logs for connection errors

### Events not received in SSE

1. Verify Redis consumer is running (check logs)
2. Ensure `sessionId` in SSE URL matches `sessionId` in publish request
3. Check Redis connectivity
4. Verify consumer group was created successfully

## Next Steps

For detailed testing instructions, see [TESTING.md](./TESTING.md)

## Architecture

```
Frontend/curl           Moby Service                Redis Stream
     |                       |                            |
     |-- GET /stream ------->|                            |
     |<-- SSE connection ----|                            |
     |                       |-- Consumer reads --------->|
     |                       |                            |
     |                       |                            |
     |-- POST /test/publish->|                            |
     |                       |-- XADD event ------------->|
     |                       |                            |
     |                       |<-- XREADGROUP event -------|
     |<-- SSE event ---------|                            |
```

## Development Workflow

1. Start Redis locally or use remote Redis
2. Run service: `REDIS_HOST=localhost tw up moby`
3. Open SSE connection in one terminal
4. Send test messages via POST endpoint
5. Verify events arrive in SSE connection
6. Iterate on code with hot reload

## Production Deployment

The service is deployed to GCP Knative. The `REDIS_HOST` environment variable is automatically injected from the infra configuration (see `backend/services/moby/infra/index.ts`).

Deploy with:

```bash
cd backend/services/moby
tw deploy .
```
