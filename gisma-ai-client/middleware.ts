import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';
const AUTH_ENDPOINT = '/auth/me';

const publicRoutes = ['/home', '/auth', '/login-success'];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public routes
  if (publicRoutes.includes(pathname)) {
    return NextResponse.next();
  }

  // Check authentication
  const token = request.cookies.get('access_token');
  
  if (token) {
      console.log('[Middleware] Auth successful');
      return NextResponse.next();
  }

  // Redirect unauthenticated users to home
  console.log('[Middleware] Auth failed');
  return NextResponse.redirect(new URL('/home', request.url));
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|mp4|webm|ogg)$).*)',
  ],
};

