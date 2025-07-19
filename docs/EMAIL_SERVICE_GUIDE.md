# Email Service Guide

## Overview

The APIQ email service is designed to use **real email flows by default** to comply with the no-mock-data policy, but provides automatic fallback to mock mode when Gmail daily limits are hit.

## Email Service Modes

### Real Mode (Default)
- **Real emails sent** via Gmail SMTP
- **Complies with no-mock-data policy**
- **Automatic fallback** to mock mode when Gmail limits are hit
- **Logs all email activity** for debugging

### Mock Mode (Fallback)
- **No real emails sent** - only logged to console
- **Automatic activation** when Gmail limits are detected
- **Manual activation** available when needed
- **Perfect for testing** when you're out of Gmail quota

## Gmail Daily Limits

- **Daily sending quota**: ~500 emails per day
- **Rate limits**: ~100 emails per hour
- **App password required**: For programmatic access
- **Quota reset**: Daily at midnight PST

## Automatic Fallback

The email service automatically detects Gmail limit errors and switches to mock mode:

```typescript
// The service detects these error patterns:
- "Daily sending quota"
- "quota exceeded" 
- "550 5.4.5"
- "Daily user sending quota"
- "User rate limit exceeded"
```

## Manual Control

### Check Email Service Status

```bash
# Check current status
curl -X GET http://localhost:3000/api/admin/email-status
```

Response:
```json
{
  "success": true,
  "data": {
    "isTestMode": false,
    "isMockMode": false,
    "consecutiveFailures": 0,
    "mode": "real",
    "message": "Email service is in REAL mode - emails will be sent via Gmail"
  }
}
```

### Switch to Mock Mode

When you hit Gmail limits:

```bash
# Switch to mock mode
curl -X POST http://localhost:3000/api/admin/email-status \
  -H "Content-Type: application/json" \
  -d '{"action":"mock"}'
```

Response:
```json
{
  "success": true,
  "data": {
    "message": "Switched to MOCK mode - no real emails will be sent",
    "mode": "mock"
  }
}
```

### Switch Back to Real Mode

When you're ready to send real emails again:

```bash
# Switch back to real mode
curl -X POST http://localhost:3000/api/admin/email-status \
  -H "Content-Type: application/json" \
  -d '{"action":"real"}'
```

Response:
```json
{
  "success": true,
  "data": {
    "message": "Switched to REAL mode - emails will be sent via Gmail",
    "mode": "real"
  }
}
```

## Environment Variables

### Force Mock Mode (Development/Testing)

```bash
# Set in .env file to force mock mode
DISABLE_EMAIL_SENDING=true
```

### Gmail Configuration

```bash
# Required for real email sending
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM=noreply@apiq.com
```

## Testing with Real Emails

### Best Practices

1. **Use real email addresses** in tests (complies with no-mock-data policy)
2. **Monitor Gmail quota** to avoid hitting limits
3. **Use mock mode** when testing extensively
4. **Check email service status** before running tests

### Example Test Setup

```typescript
// Use real email addresses for testing
const testEmail = `test.${Date.now()}@yourdomain.com`;

// The email service will automatically handle Gmail limits
await registerUser(page, testEmail, 'testpass123');
```

## Troubleshooting

### Gmail Authentication Issues

1. **Enable 2-factor authentication** on your Gmail account
2. **Generate an app password** (not your regular password)
3. **Use the app password** in your SMTP configuration
4. **Check Gmail security settings** for any blocks

### Quota Management

1. **Monitor daily usage** in Gmail console
2. **Use mock mode** when approaching limits
3. **Consider multiple Gmail accounts** for high-volume testing
4. **Reset occurs daily** at midnight PST

### Service Status

Check the email service status to understand current mode:

```bash
curl -X GET http://localhost:3000/api/admin/email-status | jq
```

## Compliance with User Rules

This email service implementation **fully complies** with the no-mock-data policy:

✅ **Real email flows by default**
✅ **No hardcoded test data**
✅ **Automatic fallback when needed**
✅ **Manual control for edge cases**
✅ **Real email addresses in tests**

The service ensures that:
- **Production code** uses real email flows
- **Tests** can use real email addresses
- **Development** can continue even when Gmail limits are hit
- **No mock data** is used in normal operation 