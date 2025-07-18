
## createConnectionForm

Fill and submit the connection creation form in the UI. Opens the modal, fills all provided fields, and submits the form.

**Usage:**

```typescript
import { createConnectionForm } from './dataHelpers';

// API Key connection
await createConnectionForm(page, {
  name: 'My Connection',
  description: 'Test connection',
  baseUrl: 'https://api.example.com',
  authType: 'API_KEY',
  apiKey: 'test-key'
});

// OAuth2 connection
await createConnectionForm(page, {
  name: 'OAuth2 Conn',
  description: 'OAuth2 test',
  baseUrl: 'https://api.oauth.com',
  authType: 'OAUTH2',
  provider: 'github',
  clientId: 'id',
  clientSecret: 'secret',
  redirectUri: 'http://localhost:3000/callback',
  scope: 'repo user'
});
``` 