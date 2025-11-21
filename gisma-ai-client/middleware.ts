import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/utils/auth';

// 1. Specify protected and public routes
const protectedRoutes = ['/chat', '/admin'];
const publicRoutes = ['/home', '/auth'];

export default async function middleware(req: NextRequest) {
  // 2. Check if the current route is protected or public
  const path = req.nextUrl.pathname;
  const isPublicRoute = publicRoutes.includes(path);
  // Check for exact match of root or if path starts with protected routes
  // But exclude public routes from being treated as protected
  const isProtectedRoute = !isPublicRoute && (
    path === '/' || protectedRoutes.some((route) =>
      path.startsWith(route)
    )
  );

  // Skip middleware for API routes, static files, and Next.js internals
  if (
    path.startsWith('/api') ||
    path.startsWith('/_next') ||
    path.startsWith('/static') ||
    path.includes('.') // Skip files with extensions (images, etc.)
  ) {
    return NextResponse.next();
  }

  // 3. Get cookies from the request
  const cookieHeader = req.headers.get('cookie');

  // 4. Verify authentication
  const isAuthenticated = await verifyAuth(cookieHeader);

  // 5. Redirect to /auth if trying to access protected route without auth
  if (isProtectedRoute && !isAuthenticated) {
    return NextResponse.redirect(new URL('/auth', req.url));
  }

  // 6. Allow /home and /auth to be accessible without authentication
  // No redirect needed for these public routes

  return NextResponse.next();
}

// Routes middleware should run on
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (images, etc.)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};

