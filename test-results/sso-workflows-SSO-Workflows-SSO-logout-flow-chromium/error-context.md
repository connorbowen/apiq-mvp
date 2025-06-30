# Page snapshot

```yaml
- img
- heading "Sign in to APIQ" [level=2]
- paragraph: Multi-API Orchestrator
- button "Continue with GitHub":
  - img
  - text: Continue with GitHub
- button "Continue with Google":
  - img
  - text: Continue with Google
- button "Continue with Slack":
  - img
  - text: Continue with Slack
- text: Or continue with Email address
- textbox "Email address"
- text: Password
- textbox "Password"
- button "Sign in"
- link "Back to home":
  - /url: /
- alert
- dialog:
  - heading "Build Error" [level=1]
  - paragraph: Failed to compile
  - text: Next.js (14.2.30) is outdated
  - link "(learn more)":
    - /url: https://nextjs.org/docs/messages/version-staleness
  - link "./pages/api/workflows/index.ts:2:1":
    - text: ./pages/api/workflows/index.ts:2:1
    - img
  - text: "Module not found: Can't resolve '../../../src/lib/database/client' 1 | import { NextApiRequest, NextApiResponse } from 'next'; > 2 | import { prisma } from '../../../src/lib/database/client'; | ^ 3 | import { logError, logInfo } from '../../../src/utils/logger'; 4 | import { requireAuth, AuthenticatedRequest } from '../../../src/lib/auth/session'; 5 | import { errorHandler } from '../../../src/middleware/errorHandler';"
  - link "https://nextjs.org/docs/messages/module-not-found":
    - /url: https://nextjs.org/docs/messages/module-not-found
  - contentinfo:
    - paragraph: This error occurred during the build process and can only be dismissed by fixing the error.
```