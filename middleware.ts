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

// Utility: Basic JWT token validation (without verification)
function isValidTokenFormat(token: string): boolean {
  try {
    // JWT tokens have 3 parts separated by dots
    const parts = token.split('.');
    if (parts.length !== 3) {
      return false;
    }
    
    // Decode the payload (second part) without verification
    const payload = JSON.parse(atob(parts[1]));
    
    // Check if token has expired
    if (payload.exp && Date.now() >= payload.exp * 1000) {
      return false;
    }
    
    // Check if token has the required fields
    if (!payload.userId || !payload.type || payload.type !== 'access') {
      return false;
    }
    
    return true;
  } catch (error) {
    return false;
  }
}

// Note: Secrets-first validation has been moved to feature-level gating
// based on user onboarding stage. This provides better UX and aligns with
// the product vision of progressive disclosure.

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
  console.log('🔍 MIDDLEWARE: Called for path:', request.nextUrl.pathname);
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

  // --- Authentication validation for protected routes ---
  if (isProtectedRoute) {
    // Check for access token in cookies and validate its format
    const accessToken = request.cookies.get('accessToken')?.value;
    console.log('🔍 MIDDLEWARE: Processing request for:', pathname);
    console.log('🔍 MIDDLEWARE: All cookies:', Array.from(request.cookies.getAll()).map(c => `${c.name}=${c.value.substring(0, 20)}...`));
    console.log('🔍 MIDDLEWARE: Access token present:', !!accessToken);
    
    if (!accessToken || !isValidTokenFormat(accessToken)) {
      console.log('🔍 MIDDLEWARE: Access token missing or invalid format, redirecting to login');
      // Clear the invalid token cookie
      const response = NextResponse.redirect(new URL('/login?reason=auth', request.url));
      response.cookies.delete('accessToken');
      response.cookies.delete('refreshToken');
      return response;
    }
    
    console.log('🔍 MIDDLEWARE: Valid access token format found, allowing access to dashboard');
    // Allow access - feature-level gating will handle secrets-first validation
  }

  // If it's a public route and user is authenticated, redirect to dashboard
  if (isPublicRoute && pathname === '/login') {
    const accessToken = request.cookies.get('accessToken')?.value;
    if (accessToken && isValidTokenFormat(accessToken)) {
      // User has a valid token format, redirect to dashboard
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