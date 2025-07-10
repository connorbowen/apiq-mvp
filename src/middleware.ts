import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

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
  
  // If it's a protected route, check for authentication
  if (isProtectedRoute) {
    // Check for access token in cookies (more secure than localStorage for SSR)
    const accessToken = request.cookies.get('accessToken')?.value;
    
    if (!accessToken) {
      // Redirect to login page with reason parameter
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('reason', 'auth');
      return NextResponse.redirect(loginUrl);
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