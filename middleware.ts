import { NextRequest, NextResponse } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Handle app-pages-internals.js serving issue
  if (pathname === '/_next/static/chunks/app-pages-internals.js') {
    // Redirect to the public file that we know works
    const url = request.nextUrl.clone();
    url.pathname = '/app-pages-internals.js';
    return NextResponse.redirect(url, 302);
  }

  // Handle protected routes - redirect to login if not authenticated
  const protectedRoutes = ['/dashboard', '/workflows', '/connections', '/secrets', '/profile'];
  const isProtectedRoute = protectedRoutes.some(route => pathname.startsWith(route));
  
  if (isProtectedRoute) {
    // Check for authentication cookie
    const accessToken = request.cookies.get('accessToken')?.value;
    
    if (!accessToken) {
      // Redirect to login page
      const loginUrl = new URL('/login', request.url);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/_next/static/chunks/app-pages-internals.js',
    '/dashboard/:path*',
    '/workflows/:path*',
    '/connections/:path*',
    '/secrets/:path*',
    '/profile/:path*',
  ],
};