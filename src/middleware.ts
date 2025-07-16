import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// --- SECRETS-FIRST-REFACTOR: Phase 13 Middleware Updates ---
// Utility: Parse cookies for connection/secret info
function getCookieValue(request: NextRequest, key: string): string | undefined {
  return request.cookies.get(key)?.value;
}

// Utility: Parse headers for connection/secret info
function getHeaderValue(request: NextRequest, key: string): string | undefined {
  return request.headers.get(key) || undefined;
}

// 1. Connection-secret validation
function validateConnectionSecret(request: NextRequest): { valid: boolean; reason?: string } {
  // Example: Expect connectionId and secretId in cookies (set after login/selection)
  const connectionId = getCookieValue(request, 'connectionId');
  const secretId = getCookieValue(request, 'secretId');
  if (!connectionId || !secretId) {
    return { valid: false, reason: 'Missing connection or secret' };
  }
  // Optionally, check for relationship (could be done deeper in API)
  return { valid: true };
}

// 2. Secret health check
function checkSecretHealth(request: NextRequest): { healthy: boolean; reason?: string } {
  // Example: secretHealth cookie set to 'unhealthy' if secret is bad
  const secretHealth = getCookieValue(request, 'secretHealth');
  if (secretHealth === 'unhealthy') {
    return { healthy: false, reason: 'Secret unhealthy' };
  }
  return { healthy: true };
}

// 3. Connection status validation
function checkConnectionStatus(request: NextRequest): { valid: boolean; reason?: string } {
  const status = getCookieValue(request, 'connectionStatus');
  if (status && status !== 'active' && status !== 'connected') {
    return { valid: false, reason: `Connection status: ${status}` };
  }
  return { valid: true };
}

// 4. Secret rotation notification
function checkSecretRotation(request: NextRequest): { needsRotation: boolean; reason?: string } {
  const needsRotation = getCookieValue(request, 'secretNeedsRotation');
  if (needsRotation === 'true') {
    return { needsRotation: true, reason: 'Secret needs rotation' };
  }
  return { needsRotation: false };
}

// 5. Connection-secret dependency validation
function validateConnectionSecretDependency(request: NextRequest): { valid: boolean; reason?: string } {
  // Example: Both connectionId and secretId must be present
  const connectionId = getCookieValue(request, 'connectionId');
  const secretId = getCookieValue(request, 'secretId');
  if (!connectionId || !secretId) {
    return { valid: false, reason: 'Missing connection-secret dependency' };
  }
  return { valid: true };
}

// 6. Secret access audit logging (non-blocking fetch)
function logSecretAccess(request: NextRequest) {
  // Fire-and-forget fetch to internal API endpoint
  try {
    fetch('/api/audit-logs', {
      method: 'POST',
      body: JSON.stringify({
        event: 'SECRET_ACCESSED',
        path: request.nextUrl.pathname,
        timestamp: Date.now(),
      }),
      headers: { 'Content-Type': 'application/json' },
      // credentials: 'include' // Not available in edge runtime, but included for reference
    });
  } catch (e) {
    // Ignore errors
  }
}

// 7. Connection health status middleware
function checkConnectionHealth(request: NextRequest): { healthy: boolean; reason?: string } {
  const health = getCookieValue(request, 'connectionHealth');
  if (health === 'unhealthy') {
    return { healthy: false, reason: 'Connection unhealthy' };
  }
  return { healthy: true };
}

// 8. Secret expiration warning
function checkSecretExpiration(request: NextRequest): { expiring: boolean; reason?: string } {
  const expiring = getCookieValue(request, 'secretExpiringSoon');
  if (expiring === 'true') {
    return { expiring: true, reason: 'Secret expiring soon' };
  }
  return { expiring: false };
}

// 9. Connection-secret relationship validation
function validateSecretConnectionRelationship(request: NextRequest): { valid: boolean; reason?: string } {
  // Example: secretConnectionId must match connectionId
  const connectionId = getCookieValue(request, 'connectionId');
  const secretConnectionId = getCookieValue(request, 'secretConnectionId');
  if (connectionId && secretConnectionId && connectionId !== secretConnectionId) {
    return { valid: false, reason: 'Secret does not belong to connection' };
  }
  return { valid: true };
}

// 10. Secret-based route protection
function checkSecretBasedRouteProtection(request: NextRequest): { allowed: boolean; reason?: string } {
  // Example: For highly sensitive routes, require a fresh secret validation flag
  const needsFreshSecret = getCookieValue(request, 'needsFreshSecret');
  if (needsFreshSecret === 'true') {
    const freshSecretValidated = getCookieValue(request, 'freshSecretValidated');
    if (freshSecretValidated !== 'true') {
      return { allowed: false, reason: 'Fresh secret validation required' };
    }
  }
  return { allowed: true };
}

// Define protected routes that require authentication
const protectedRoutes = [
  '/dashboard',
  '/workflows',
  '/secrets',
];

// Define public routes that don't require authentication
const publicRoutes = [
  '/login',
  '/signup',
  '/forgot-password',
  '/forgot-password-success',
  '/reset-password',
  '/verify',
  '/oauth/callback',
  '/api/auth',
];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Check if the current path is a protected route
  const isProtectedRoute = protectedRoutes.some(route => 
    pathname.startsWith(route)
  );

  // Check if the current path is a public route
  const isPublicRoute = publicRoutes.some(route => 
    pathname.startsWith(route)
  );

  // Skip middleware for API routes (they handle their own auth)
  if (pathname.startsWith('/api/')) {
    return NextResponse.next();
  }

  // Skip middleware for static files
  if (pathname.startsWith('/_next/') || 
      pathname.startsWith('/favicon.ico') ||
      pathname.includes('.')) {
    return NextResponse.next();
  }

  // --- SECRETS-FIRST: Connection-secret validation for protected routes ---
  if (isProtectedRoute) {
    // Check for access token in cookies (more secure than localStorage for SSR)
    const accessToken = request.cookies.get('accessToken')?.value;
    if (!accessToken) {
      // Redirect to login page with reason parameter
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('reason', 'auth');
      return NextResponse.redirect(loginUrl);
    }
    // Connection-secret validation
    const { valid, reason } = validateConnectionSecret(request);
    if (!valid) {
      // Redirect to onboarding or error page
      const errorUrl = new URL('/secrets/onboarding', request.url);
      errorUrl.searchParams.set('reason', reason || 'missing-connection-secret');
      return NextResponse.redirect(errorUrl);
    }
    // Secret health check
    const { healthy, reason: healthReason } = checkSecretHealth(request);
    if (!healthy) {
      // Redirect to secret health warning page
      const warnUrl = new URL('/secrets/health-warning', request.url);
      warnUrl.searchParams.set('reason', healthReason || 'secret-unhealthy');
      return NextResponse.redirect(warnUrl);
    }
    // 3. Connection status validation
    const { valid: connectionStatusValid, reason: connectionStatusReason } = checkConnectionStatus(request);
    if (!connectionStatusValid) {
      const errorUrl = new URL('/secrets/connection-error', request.url);
      errorUrl.searchParams.set('reason', connectionStatusReason || 'connection-status-invalid');
      return NextResponse.redirect(errorUrl);
    }
    // 4. Secret rotation notification (set header)
    const { needsRotation, reason: rotationReason } = checkSecretRotation(request);
    if (needsRotation) {
      const response = NextResponse.next();
      response.headers.set('X-Secret-Rotation-Notice', rotationReason || 'Secret needs rotation');
      return response;
    }
    // 5. Connection-secret dependency validation
    const { valid: dependencyValid, reason: dependencyReason } = validateConnectionSecretDependency(request);
    if (!dependencyValid) {
      const errorUrl = new URL('/secrets/onboarding', request.url);
      errorUrl.searchParams.set('reason', dependencyReason || 'missing-connection-secret-dependency');
      return NextResponse.redirect(errorUrl);
    }
    // 6. Secret access audit logging (non-blocking)
    logSecretAccess(request);
    // 7. Connection health status
    const { healthy: connectionHealthy, reason: connectionHealthReason } = checkConnectionHealth(request);
    if (!connectionHealthy) {
      const warnUrl = new URL('/secrets/connection-health-warning', request.url);
      warnUrl.searchParams.set('reason', connectionHealthReason || 'connection-unhealthy');
      return NextResponse.redirect(warnUrl);
    }
    // 8. Secret expiration warning (set header)
    const { expiring, reason: expirationReason } = checkSecretExpiration(request);
    if (expiring) {
      const response = NextResponse.next();
      response.headers.set('X-Secret-Expiration-Warning', expirationReason || 'Secret expiring soon');
      return response;
    }
    // 9. Connection-secret relationship validation
    const { valid: relationshipValid, reason: relationshipReason } = validateSecretConnectionRelationship(request);
    if (!relationshipValid) {
      const errorUrl = new URL('/secrets/onboarding', request.url);
      errorUrl.searchParams.set('reason', relationshipReason || 'invalid-secret-connection-relationship');
      return NextResponse.redirect(errorUrl);
    }
    // 10. Secret-based route protection
    const { allowed, reason: secretRouteReason } = checkSecretBasedRouteProtection(request);
    if (!allowed) {
      const errorUrl = new URL('/secrets/reauth', request.url);
      errorUrl.searchParams.set('reason', secretRouteReason || 'fresh-secret-validation-required');
      return NextResponse.redirect(errorUrl);
    }
  }

  // If it's a public route and user is authenticated, redirect to dashboard
  if (isPublicRoute && pathname === '/login') {
    const accessToken = request.cookies.get('accessToken')?.value;
    if (accessToken) {
      // User is already authenticated, redirect to dashboard
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
}; 