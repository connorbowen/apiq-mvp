# AI Orchestration Implementation Guide

## Quick Start

### 1. Test the AI Orchestrator

```bash
# Test with a valid JWT token
curl -X POST http://localhost:3000/api/chat/process \
  -H "Content-Type: application/json" \
  -H "Cookie: accessToken=YOUR_JWT_TOKEN" \
  -d '{"message": "Create a workflow to send a Slack message when a GitHub issue is created"}'
```

### 2. Run E2E Tests

```bash
# Test workflow generation with AI orchestrator
npx playwright test tests/e2e/workflow-engine/core-workflow-generation.test.ts --workers=1
```

## File Structure

```
pages/api/chat/
├── process.ts          # AI orchestrator endpoint
└── classify.ts         # Message classification endpoint

src/lib/api/
└── client.ts           # Updated with processMessage method

src/components/
└── ChatInterface.tsx   # Simplified to use AI orchestrator

tests/helpers/
└── createTestApiConnection.ts  # Updated with provider support
```

## API Endpoints

### POST /api/chat/process

**Purpose**: Main AI orchestrator endpoint

**Request**:
```json
{
  "message": "Create a workflow to send Slack notifications"
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "type": "workflow",
    "content": "I've created a workflow for you!",
    "workflow": { /* workflow object */ },
    "steps": [ /* workflow steps */ ]
  }
}
```

**Response Types**:
- `workflow` - Workflow generation response
- `connection_guidance` - Connection setup guidance
- `direct_api_call` - Direct API execution (future)
- `general_chat` - General conversation

### POST /api/chat/classify

**Purpose**: AI-powered message classification

**Request**:
```json
{
  "message": "Help me connect to Stripe"
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "type": "connection_guidance",
    "confidence": 0.95,
    "reasoning": "User is asking for help with API connection",
    "suggestedActions": ["Connect to Stripe API", "Configure authentication"],
    "requiresApiConnections": true
  }
}
```

## Code Examples

### Using the AI Orchestrator in Frontend

```typescript
// Old approach - complex client-side logic
const response = await apiClient.classifyMessage(message);
if (response.data.type === 'workflow') {
  const workflowResponse = await apiClient.generateWorkflow(message);
  // Handle workflow...
} else if (response.data.type === 'direct_api_call') {
  const apiResponse = await apiClient.executeDirectApiCall(message);
  // Handle API call...
}

// New approach - single AI orchestrator call
const response = await apiClient.processMessage(message);
// AI orchestrator handles all routing automatically
```

### Creating Test Connections

```typescript
// Old approach - generic test connection
await createTestApiConnection(userId);

// New approach - specific provider connections
await createTestApiConnection(userId, 'github');
await createTestApiConnection(userId, 'slack');
await createTestApiConnection(userId, 'trello');
```

## Configuration

### Environment Variables

```bash
# Required
OPENAI_API_KEY=your_openai_api_key
JWT_SECRET=your_jwt_secret
DATABASE_URL=your_database_url

# Optional
JWT_EXPIRES_IN=24h
```

### Dependencies

```json
{
  "dependencies": {
    "openai": "^4.0.0",
    "jsonwebtoken": "^9.0.0",
    "prisma": "^5.0.0"
  }
}
```

## Error Handling

### Common Errors

1. **Authentication Error (401)**
   ```json
   {
     "success": false,
     "error": "Authentication required"
   }
   ```

2. **AI Classification Error (500)**
   ```json
   {
     "success": false,
     "error": "Failed to process message"
   }
   ```

3. **Validation Error (400)**
   ```json
   {
     "success": false,
     "error": "Message is required"
   }
   ```

### Error Recovery

The AI orchestrator includes fallback mechanisms:
- If AI classification fails, uses rules-based classification
- If workflow generation fails, returns error with guidance
- If connection guidance fails, provides generic help

## Testing

### Unit Tests

```typescript
// Test AI orchestrator endpoint
describe('AI Orchestrator', () => {
  it('should classify workflow messages', async () => {
    const response = await request(app)
      .post('/api/chat/process')
      .send({ message: 'Create a workflow' })
      .expect(200);
    
    expect(response.body.data.type).toBe('workflow');
  });
});
```

### E2E Tests

```typescript
// Test workflow generation with AI orchestrator
test('should generate workflow with AI orchestrator', async ({ page }) => {
  await page.goto('/dashboard?tab=chat');
  await page.fill('[data-testid="chat-input"]', 'Create a workflow');
  await page.click('[data-testid="primary-action chat-send-btn"]');
  
  // AI orchestrator handles everything automatically
  await expect(page.locator('[data-testid="workflow-steps"]')).toBeVisible();
});
```

## Debugging

### Enable Debug Logging

```typescript
// In your environment
DEBUG=apiq:ai-orchestrator
```

### Common Debug Issues

1. **AI Classification Failing**
   - Check OpenAI API key
   - Verify message format
   - Check AI service logs

2. **Connection Guidance Not Working**
   - Verify user has API connections
   - Check connection status
   - Validate connection names

3. **Workflow Generation Failing**
   - Check available connections
   - Verify endpoint data
   - Check workflow service logs

## Performance Optimization

### Caching

```typescript
// Cache AI classification results
const cacheKey = `classification:${message}`;
const cached = await redis.get(cacheKey);
if (cached) return JSON.parse(cached);

const result = await classificationService.classifyMessage(message);
await redis.setex(cacheKey, 300, JSON.stringify(result)); // 5 min cache
```

### Connection Optimization

```typescript
// Only fetch connections when needed
const connections = await prisma.apiConnection.findMany({
  where: { userId: user.id, status: 'ACTIVE' },
  select: { id: true, name: true, baseUrl: true, endpoints: true }
});
```

## Monitoring

### Key Metrics

- AI classification accuracy
- Response time per service type
- Error rates by endpoint
- User satisfaction scores

### Logging

```typescript
// Log AI decisions
console.log('🤖 AI Orchestrator:', {
  message: message.substring(0, 100),
  classification: classification.type,
  confidence: classification.confidence,
  userId: user.id
});
```

## Security Considerations

### Input Validation

```typescript
// Validate message input
if (!message || typeof message !== 'string' || message.length > 1000) {
  return res.status(400).json({ success: false, error: 'Invalid message' });
}
```

### Rate Limiting

```typescript
// Add rate limiting to AI orchestrator
const rateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
```

## Troubleshooting

### Common Issues

1. **"Failed to process message"**
   - Check server logs for specific error
   - Verify all services are running
   - Check database connectivity

2. **AI Classification Inconsistent**
   - Review message examples
   - Check OpenAI API status
   - Verify classification service configuration

3. **Workflow Generation Failing**
   - Check available connections
   - Verify connection endpoints
   - Check workflow service logs

### Debug Commands

```bash
# Check server status
curl http://localhost:3000/api/health

# Test AI orchestrator
curl -X POST http://localhost:3000/api/chat/process \
  -H "Content-Type: application/json" \
  -H "Cookie: accessToken=YOUR_TOKEN" \
  -d '{"message": "test"}'

# Check logs
tail -f logs/combined.log | grep "AI Orchestrator"
```

## Migration Checklist

- [ ] Deploy AI orchestrator endpoint
- [ ] Update ChatInterface to use processMessage
- [ ] Update API client with new methods
- [ ] Update E2E tests for new flow
- [ ] Test with real user scenarios
- [ ] Monitor performance and errors
- [ ] Update documentation

## Support

For issues or questions:
1. Check the logs for specific error messages
2. Verify all dependencies are installed
3. Test with simple messages first
4. Check OpenAI API status
5. Review the troubleshooting section above
