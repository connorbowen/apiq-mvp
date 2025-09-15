# AI Orchestration Quick Reference

## 🚀 Quick Start

### Test the AI Orchestrator
```bash
# Test with valid JWT token
curl -X POST http://localhost:3000/api/chat/process \
  -H "Content-Type: application/json" \
  -H "Cookie: accessToken=YOUR_JWT_TOKEN" \
  -d '{"message": "Create a workflow to send Slack notifications"}'
```

### Run E2E Tests
```bash
npx playwright test tests/e2e/workflow-engine/core-workflow-generation.test.ts --workers=1
```

## 📁 Key Files

| File | Purpose | Status |
|------|---------|--------|
| `pages/api/chat/process.ts` | AI orchestrator endpoint | ✅ New |
| `pages/api/chat/classify.ts` | Message classification | ✅ New |
| `src/components/ChatInterface.tsx` | Simplified frontend | 🔄 Updated |
| `src/lib/api/client.ts` | API client methods | 🔄 Updated |

## 🔄 Message Flow

```
User Input → ChatInterface → AI Orchestrator → Appropriate Service → Display
```

## 📊 Response Types

| Type | Description | Example |
|------|-------------|---------|
| `workflow` | Workflow generation | "Create a workflow to..." |
| `connection_guidance` | API connection help | "Help me connect to Stripe" |
| `direct_api_call` | Direct API execution | "Call the GitHub API" |
| `general_chat` | General conversation | "Hello, how are you?" |

## 🛠️ API Methods

### Frontend (ChatInterface)
```typescript
// Old approach - multiple API calls
const classification = await apiClient.classifyMessage(message);
const workflow = await apiClient.generateWorkflow(message);
// ... complex routing logic

// New approach - single AI orchestrator call
const response = await apiClient.processMessage(message);
// AI orchestrator handles everything automatically
```

### Backend (AI Orchestrator)
```typescript
// POST /api/chat/process
{
  "message": "Create a workflow to send Slack notifications"
}

// Response
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

## 🧪 Testing

### Create Test Connections
```typescript
// Old approach
await createTestApiConnection(userId);

// New approach - specific providers
await createTestApiConnection(userId, 'github');
await createTestApiConnection(userId, 'slack');
await createTestApiConnection(userId, 'trello');
```

### E2E Test Example
```typescript
test('should generate workflow with AI orchestrator', async ({ page }) => {
  await page.goto('/dashboard?tab=chat');
  await page.fill('[data-testid="chat-input"]', 'Create a workflow');
  await page.click('[data-testid="primary-action chat-send-btn"]');
  
  // AI orchestrator handles everything automatically
  await expect(page.locator('[data-testid="workflow-steps"]')).toBeVisible();
});
```

## 🐛 Common Issues

### 1. "Failed to process message"
- **Cause**: Authentication error or service failure
- **Fix**: Check JWT token and server logs

### 2. AI Classification Inconsistent
- **Cause**: OpenAI API issues or message format
- **Fix**: Check OpenAI API key and message examples

### 3. Workflow Generation Failing
- **Cause**: Missing or invalid API connections
- **Fix**: Create specific provider connections

## 📈 Performance

- **AI Classification**: ~200-500ms latency
- **Response Time**: Optimized for single request
- **Memory Usage**: Reduced client-side processing
- **Database**: Efficient single-query approach

## 🔒 Security

- **Authentication**: Required for all endpoints
- **Input Validation**: Message length and format checks
- **Error Handling**: Secure error responses
- **Data Isolation**: User data properly separated

## 📝 Logging

```typescript
// AI Orchestrator logs
console.log('🤖 AI Orchestrator:', {
  message: message.substring(0, 100),
  classification: classification.type,
  confidence: classification.confidence,
  userId: user.id
});
```

## 🚀 Future Enhancements

### Ready to Implement
- [ ] Direct API call support
- [ ] Additional service types
- [ ] Context awareness

### Planned Features
- [ ] AI classification caching
- [ ] Performance analytics
- [ ] A/B testing support

## 📚 Documentation

- [AI Orchestration Architecture](AI_ORCHESTRATION_ARCHITECTURE.md)
- [Implementation Guide](AI_ORCHESTRATION_IMPLEMENTATION.md)
- [Changelog](AI_ORCHESTRATION_CHANGELOG.md)
- [Quick Reference](AI_ORCHESTRATION_QUICK_REFERENCE.md) (this file)

## 🆘 Support

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

### Common Solutions
1. **Restart server** if endpoints not responding
2. **Check OpenAI API key** if AI classification failing
3. **Verify connections** if workflow generation failing
4. **Check logs** for specific error messages
5. **Test with simple messages** first

## ✅ Migration Checklist

- [x] Deploy AI orchestrator endpoint
- [x] Update ChatInterface to use processMessage
- [x] Update API client with new methods
- [x] Update E2E tests for new flow
- [x] Test with real user scenarios
- [x] Monitor performance and errors
- [x] Update documentation

## 🎯 Key Benefits

1. **Simplified Frontend**: ChatInterface reduced from 1052 to 966 lines
2. **AI-Powered Intelligence**: AI determines optimal service routing
3. **Centralized Logic**: All routing logic in one place
4. **Better Maintainability**: Clear separation of concerns
5. **Consistent Experience**: Unified response format
6. **Future-Ready**: Easy to add new services and features
