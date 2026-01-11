# Moby Service - SSE Streaming Testing Guide

This guide shows how to test the SSE streaming implementation using Postman or curl.

## Prerequisites

1. Moby service is running with `REDIS_HOST` configured
2. Redis is accessible and running

## Testing Flow

### Step 1: Open SSE Connection

**Using Browser or EventSource client:**

```javascript
// In browser console or Node.js
const eventSource = new EventSource('http://localhost:8080/stream/test-session-123');

eventSource.onopen = () => {
  console.log('✅ SSE connection opened');
};

eventSource.addEventListener('connected', (e) => {
  console.log('✅ Connection confirmed:', JSON.parse(e.data));
});

eventSource.addEventListener('text_chunk', (e) => {
  const data = JSON.parse(e.data);
  console.log('📝 Text chunk received:', data);
});

eventSource.addEventListener('reasoning_chunk', (e) => {
  const data = JSON.parse(e.data);
  console.log('🤔 Reasoning chunk received:', data);
});

eventSource.addEventListener('tool_call_started', (e) => {
  const data = JSON.parse(e.data);
  console.log('🔧 Tool started:', data);
});

eventSource.addEventListener('tool_call_completed', (e) => {
  const data = JSON.parse(e.data);
  console.log('✅ Tool completed:', data);
});

eventSource.addEventListener('chat_done', (e) => {
  const data = JSON.parse(e.data);
  console.log('🎉 Chat done:', data);
});

eventSource.onerror = (error) => {
  console.error('❌ SSE error:', error);
};
```

**Using curl (Terminal 1):**

```bash
curl -N http://localhost:8080/stream/test-session-123
```

You should see:

```
data: {"type":"connected","sessionId":"test-session-123"}
```

### Step 2: Publish Test Messages

**Using Postman:**

1. Create a new POST request to: `http://localhost:8080/test/publish`
2. Set Headers:
   - `Content-Type: application/json`
3. Set Body (raw JSON):

#### Example 1: Text Chunk

```json
{
  "sessionId": "test-session-123",
  "conversationId": "test-conv-456",
  "eventType": "text_chunk",
  "data": {
    "content": "Hello from Postman!",
    "index": 0
  }
}
```

#### Example 2: Reasoning Chunk

```json
{
  "sessionId": "test-session-123",
  "conversationId": "test-conv-456",
  "eventType": "reasoning_chunk",
  "data": {
    "content": "I'm thinking about how to solve this problem..."
  }
}
```

#### Example 3: Tool Call Started

```json
{
  "sessionId": "test-session-123",
  "conversationId": "test-conv-456",
  "eventType": "tool_call_started",
  "data": {
    "toolName": "TextToSQL",
    "parameters": {
      "question": "What were my sales yesterday?",
      "shopId": "shop.myshopify.com"
    }
  }
}
```

#### Example 4: Tool Call Completed

```json
{
  "sessionId": "test-session-123",
  "conversationId": "test-conv-456",
  "eventType": "tool_call_completed",
  "data": {
    "toolName": "TextToSQL",
    "result": {
      "query": "SELECT SUM(revenue) FROM orders WHERE date = '2025-01-18'",
      "rows": [{ "sum": 15420.5 }]
    }
  }
}
```

#### Example 5: Tool Call Failed

```json
{
  "sessionId": "test-session-123",
  "conversationId": "test-conv-456",
  "eventType": "tool_call_failed",
  "data": {
    "toolName": "Surfer",
    "error": "Connection timeout"
  }
}
```

#### Example 6: Chat Done

```json
{
  "sessionId": "test-session-123",
  "conversationId": "test-conv-456",
  "eventType": "chat_done",
  "data": {
    "message": "Chat completed successfully"
  }
}
```

**Using curl (Terminal 2):**

```bash
curl -X POST http://localhost:8080/test/publish \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "test-session-123",
    "conversationId": "test-conv-456",
    "eventType": "text_chunk",
    "data": {
      "content": "Hello from curl!",
      "index": 0
    }
  }'
```

### Step 3: Verify Events

You should see the events appear in your SSE connection (Terminal 1 or browser console) immediately after publishing.

## Complete Test Scenario

Here's a complete conversation simulation:

### 1. Open SSE Connection

```bash
# Terminal 1
curl -N http://localhost:8080/stream/demo-session
```

### 2. Simulate AI Response Stream

Send these requests in sequence using Postman or curl:

**Request 1: Start reasoning**

```json
{
  "sessionId": "demo-session",
  "conversationId": "demo-conv",
  "eventType": "reasoning_chunk",
  "data": {
    "content": "The user is asking about sales data. I need to use the TextToSQL tool."
  }
}
```

**Request 2: Start tool execution**

```json
{
  "sessionId": "demo-session",
  "conversationId": "demo-conv",
  "eventType": "tool_call_started",
  "data": {
    "toolName": "TextToSQL",
    "parameters": {
      "question": "What were my total sales this week?"
    }
  }
}
```

**Request 3: Tool completes**

```json
{
  "sessionId": "demo-session",
  "conversationId": "demo-conv",
  "eventType": "tool_call_completed",
  "data": {
    "toolName": "TextToSQL",
    "result": {
      "total_sales": 45280.75
    }
  }
}
```

**Request 4: Stream response chunks**

```json
{
  "sessionId": "demo-session",
  "conversationId": "demo-conv",
  "eventType": "text_chunk",
  "data": {
    "content": "Based on the data, ",
    "index": 0
  }
}
```

```json
{
  "sessionId": "demo-session",
  "conversationId": "demo-conv",
  "eventType": "text_chunk",
  "data": {
    "content": "your total sales this week ",
    "index": 1
  }
}
```

```json
{
  "sessionId": "demo-session",
  "conversationId": "demo-conv",
  "eventType": "text_chunk",
  "data": {
    "content": "were $45,280.75!",
    "index": 2
  }
}
```

**Request 5: Mark completion**

```json
{
  "sessionId": "demo-session",
  "conversationId": "demo-conv",
  "eventType": "chat_done",
  "data": {
    "message": "Chat completed"
  }
}
```

## Expected Output in SSE Connection

```
data: {"type":"connected","sessionId":"demo-session"}

event: reasoning_chunk
data: {"content":"The user is asking about sales data. I need to use the TextToSQL tool.","conversationId":"demo-conv","timestamp":"1737123456789"}

event: tool_call_started
data: {"toolName":"TextToSQL","parameters":{"question":"What were my total sales this week?"},"conversationId":"demo-conv","timestamp":"1737123457890"}

event: tool_call_completed
data: {"toolName":"TextToSQL","result":{"total_sales":45280.75},"conversationId":"demo-conv","timestamp":"1737123458901"}

event: text_chunk
data: {"content":"Based on the data, ","index":0,"conversationId":"demo-conv","timestamp":"1737123459012"}

event: text_chunk
data: {"content":"your total sales this week ","index":1,"conversationId":"demo-conv","timestamp":"1737123459123"}

event: text_chunk
data: {"content":"were $45,280.75!","index":2,"conversationId":"demo-conv","timestamp":"1737123459234"}

event: chat_done
data: {"message":"Chat completed","conversationId":"demo-conv","timestamp":"1737123459345"}
```

## Troubleshooting

### No events received in SSE connection

1. Check if Redis consumer is running:

   - Look for log: `Redis stream consumer started successfully`

2. Check if SSE connection is established:

   - Should see: `SSE connection established` in logs

3. Check if messages are being published:

   - POST to `/test/publish` should return `success: true`

4. Check Redis connectivity:
   - Verify `REDIS_HOST` environment variable is set
   - Check service logs for Redis connection errors

### Events not appearing for the right session

- Ensure `sessionId` in the SSE URL matches `sessionId` in publish requests
- Example: `/stream/test-123` must use `"sessionId": "test-123"` in publish

### Consumer not acknowledging messages

- Check logs for: `Message acknowledged`
- If not appearing, SSE connection might be closed
- Verify the consumer loop is running

## Monitoring

Check service logs for these key messages:

```
✅ SSE connection established
✅ Redis stream consumer started successfully
✅ Processing Redis event
✅ Event forwarded to SSE
✅ Message acknowledged
```

## Next Steps

Once this test flow works:

1. Implement the AI Moby Python service to publish real events
2. Create the chat POST endpoint that forwards to AI Moby
3. Connect the frontend to use SSE instead of Socket.IO
