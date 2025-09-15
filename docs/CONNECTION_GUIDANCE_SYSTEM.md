# Connection Guidance System

## Overview

The Connection Guidance System provides intelligent assistance when users request workflows or direct API calls that require APIs they haven't connected yet. It automatically detects missing APIs from natural language requests and provides step-by-step setup guidance directly in the chat interface.

## Features

- **Intelligent API Detection**: Automatically identifies missing APIs from user messages
- **Comprehensive API Knowledge Base**: 25+ APIs with detailed setup instructions
- **Multiple Authentication Types**: Support for API_KEY, BEARER_TOKEN, OAUTH2, and BASIC_AUTH
- **In-Chat Setup**: Seamless connection setup without leaving the chat interface
- **Real-time Validation**: Test connections before saving
- **Step-by-Step Guidance**: Detailed setup instructions for each API type

## Architecture

### ConnectionGuidanceService

Located at `src/lib/services/connectionGuidanceService.ts`, this service provides the core intelligence for API detection and guidance generation.

#### Key Methods

- `analyzeRequest(userDescription: string, connections: ApiConnection[])`: Analyzes user requests and returns guidance
- `extractMentionedApis(message: string)`: Extracts API names from natural language
- `getApiSuggestion(apiName: string)`: Retrieves API details from knowledge base

#### API Knowledge Base

The service maintains a comprehensive knowledge base of 25+ APIs including:

- **Communication**: Slack, Discord, Microsoft Teams
- **Development**: GitHub, GitLab, Bitbucket
- **AI/ML**: OpenAI, Anthropic, Hugging Face
- **Cloud Services**: AWS, Google Cloud, Azure
- **Productivity**: Notion, Airtable, Trello
- **E-commerce**: Shopify, Stripe, PayPal
- **And many more...**

Each API entry includes:
- Display name and description
- Authentication type
- Setup instructions (3 steps + additional notes)
- Documentation URL
- Base URL and common endpoints

### ConnectionSetupForm

Located at `src/components/ConnectionSetupForm.tsx`, this React component provides the UI for in-chat connection setup.

#### Features

- **Dynamic Form Fields**: Adapts to different authentication types
- **Real-time Validation**: Tests connections before saving
- **Error Handling**: Clear error messages and recovery options
- **Loading States**: Visual feedback during operations
- **Accessibility**: Full keyboard navigation and screen reader support

#### Authentication Types Supported

1. **API_KEY**: Single API key input
2. **BEARER_TOKEN**: Bearer token input
3. **BASIC_AUTH**: Username and password inputs
4. **OAUTH2**: Client ID and Client Secret inputs

## Integration

### ChatInterface Integration

The system integrates seamlessly with the ChatInterface component:

1. **Message Analysis**: When users send messages, the system analyzes them for API requirements
2. **Guidance Display**: If missing APIs are detected, guidance is shown with setup buttons
3. **Setup Flow**: Users can click "Set up in Chat" to open the connection form
4. **Success Handling**: After successful setup, guidance disappears and workflows can proceed

### API Endpoints

- **`/api/workflows/generate`**: Analyzes workflow requests and returns connection guidance
- **`/api/connections/test`**: Tests connection credentials before saving
- **`/api/connections`**: Creates new connections after successful setup

## Usage Examples

### Basic Workflow Request

```typescript
// User message: "Create a workflow that sends a Slack notification"
// System detects: Missing Slack API
// Response: Shows Slack setup guidance with "Set up in Chat" button
```

### Multi-API Workflow

```typescript
// User message: "Create a workflow that sends GitHub issues to Slack"
// System detects: Missing GitHub and Slack APIs
// Response: Shows both APIs with individual setup buttons
```

### Direct API Call

```typescript
// User message: "Make a call to the OpenAI API"
// System detects: Missing OpenAI API
// Response: Shows OpenAI setup guidance with API key input
```

## Testing

### E2E Test Coverage

The system includes comprehensive E2E test coverage with 24/25 tests passing (96% success rate):

- **API Detection Tests**: Verify correct API identification from messages
- **Setup Flow Tests**: Test complete connection setup process
- **Error Handling Tests**: Verify graceful error handling
- **Authentication Type Tests**: Test all supported auth types
- **UX Compliance Tests**: Ensure accessibility and mobile responsiveness

### Test Commands

```bash
# Run connection guidance tests
npm run test:e2e:connections-area

# Run specific connection guidance test
npx playwright test tests/e2e/chat/connection-guidance.test.ts

# Run with debugging
npx playwright test tests/e2e/chat/connection-guidance.test.ts --debug
```

## Configuration

### Environment Variables

No additional environment variables are required. The system uses existing database and authentication infrastructure.

### Database Schema

The system uses existing `ApiConnection` and `Secret` models for storing connection data.

## Error Handling

### Common Issues

1. **API Not Detected**: Ensure message contains clear API references
2. **Setup Failures**: Check credentials and API availability
3. **Timeout Issues**: Increase timeout values for slow APIs

### Debugging

Enable debug logging by setting `NODE_ENV=development` to see detailed analysis logs.

## Future Enhancements

- **API Suggestions**: Suggest alternative APIs when requested ones aren't available
- **Bulk Setup**: Allow setting up multiple APIs at once
- **Template Connections**: Pre-configured connection templates for common APIs
- **Usage Analytics**: Track which APIs are most commonly requested

## Contributing

### Adding New APIs

To add a new API to the knowledge base:

1. Add entry to `API_KNOWLEDGE_BASE` in `connectionGuidanceService.ts`
2. Include all required fields (name, displayName, description, authType, setupInstructions)
3. Add test cases for the new API
4. Update documentation

### Testing New Features

1. Write E2E tests for new functionality
2. Ensure UX compliance validation passes
3. Test across different authentication types
4. Verify mobile responsiveness

## Related Documentation

- [E2E Test Guide](E2E_TEST_GUIDE.md)
- [UX Specification](UX_SPEC.md)
- [API Reference](API_REFERENCE.md)
- [Testing Strategy](TESTING_STRATEGY.md)
