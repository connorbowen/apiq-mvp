# OAuth2 Naming Clarification

## Current State

The codebase currently has two distinct OAuth2 flows that use similar naming, which can cause confusion:

### 1. User Authentication OAuth2 (Google Sign-in)
- **Purpose**: Allow users to sign in to the application using Google OAuth2
- **Current Location**: `/api/auth/oauth2/`
- **Files**: 
  - `pages/api/auth/oauth2.ts`
  - `pages/api/auth/oauth2/callback.ts`
- **Frontend**: `src/app/login/page.tsx` (OAuth2 login button)

### 2. API Connection OAuth2 (Third-party API Integration)
- **Purpose**: Allow users to connect their API connections to third-party services via OAuth2
- **Current Location**: `/api/oauth/`
- **Files**:
  - `pages/api/oauth/authorize.ts`
  - `pages/api/oauth/callback.ts`
  - `pages/api/oauth/token.ts`
  - `pages/api/oauth/refresh.ts`
  - `pages/api/oauth/providers.ts`
- **Frontend**: 
  - `src/app/oauth/authorize/page.tsx`
  - `src/app/oauth/callback/page.tsx`
  - `src/app/connections/[id]/oauth2/page.tsx`
  - `src/components/OAuth2Manager.tsx`

## Proposed Renaming Strategy

### Option 1: Descriptive Directory Names (Recommended)

#### User Authentication OAuth2
- **New Path**: `/api/auth/sso/` (Single Sign-On)
- **Files**:
  - `pages/api/auth/sso/google.ts`
  - `pages/api/auth/sso/callback.ts`
- **Frontend**: Update login page to use `/api/auth/sso/google`

#### API Connection OAuth2
- **New Path**: `/api/connections/oauth2/` (more specific)
- **Files**:
  - `pages/api/connections/oauth2/authorize.ts`
  - `pages/api/connections/oauth2/callback.ts`
  - `pages/api/connections/oauth2/token.ts`
  - `pages/api/connections/oauth2/refresh.ts`
  - `pages/api/connections/oauth2/providers.ts`
- **Frontend**: Update all references to use new paths

### Option 2: Service-Specific Names

#### User Authentication OAuth2
- **New Path**: `/api/auth/google/`
- **Files**:
  - `pages/api/auth/google/authorize.ts`
  - `pages/api/auth/google/callback.ts`

#### API Connection OAuth2
- **New Path**: `/api/connections/oauth2/` (same as Option 1)

### Option 3: Minimal Changes (Current Structure with Better Documentation)

Keep current structure but add clear documentation and comments distinguishing the two flows.

## Recommended Implementation: Option 1

### Benefits:
1. **Clear Separation**: `/api/auth/sso/` vs `/api/connections/oauth2/`
2. **Scalable**: Easy to add more SSO providers (Okta, Azure AD, etc.)
3. **Intuitive**: Developers immediately understand the purpose
4. **Minimal Breaking Changes**: Only requires path updates

### Implementation Steps:

1. **Create new directory structure**
2. **Move and rename files**
3. **Update all API client references**
4. **Update frontend components**
5. **Update tests**
6. **Add redirects for backward compatibility (optional)**

### File Mapping:

| Current | New |
|---------|-----|
| `pages/api/auth/oauth2.ts` | `pages/api/auth/sso/google.ts` |
| `pages/api/auth/oauth2/callback.ts` | `pages/api/auth/sso/callback.ts` |
| `pages/api/oauth/authorize.ts` | `pages/api/connections/oauth2/authorize.ts` |
| `pages/api/oauth/callback.ts` | `pages/api/connections/oauth2/callback.ts` |
| `pages/api/oauth/token.ts` | `pages/api/connections/oauth2/token.ts` |
| `pages/api/oauth/refresh.ts` | `pages/api/connections/oauth2/refresh.ts` |
| `pages/api/oauth/providers.ts` | `pages/api/connections/oauth2/providers.ts` |

### Frontend Updates:

| Current | New |
|---------|-----|
| `src/app/oauth/authorize/page.tsx` | `src/app/connections/oauth2/authorize/page.tsx` |
| `src/app/oauth/callback/page.tsx` | `src/app/connections/oauth2/callback/page.tsx` |
| `src/app/connections/[id]/oauth2/page.tsx` | `src/app/connections/[id]/oauth2/page.tsx` (no change) |

## Alternative: Option 3 (Minimal Changes)

If the renaming is too disruptive, we can:

1. **Add clear documentation** to each OAuth2 endpoint
2. **Update comments** in code to distinguish the two flows
3. **Add descriptive prefixes** to function names
4. **Create a clear README** explaining the two OAuth2 systems

## Decision

**Recommendation**: Implement Option 1 (Descriptive Directory Names) as it provides the clearest separation and is most intuitive for developers.

**Fallback**: If Option 1 is too disruptive, implement Option 3 (Minimal Changes with Better Documentation). 