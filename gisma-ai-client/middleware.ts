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

  // Check authentication by calling /me endpoint
  try {
    const cookieHeader = request.headers.get('cookie');
    
    if (!cookieHeader) {
      console.log('[Middleware] No cookies found');
      return NextResponse.redirect(new URL('/home', request.url));
    }

    const response = await fetch(`${API_BASE_URL}${AUTH_ENDPOINT}`, {
      method: 'GET',
      headers: {
        'Cookie': cookieHeader,
        'Content-Type': 'application/json',
      },
      credentials: 'include',
    });

    if (response.ok) {
      console.log('[Middleware] Auth successful');
      return NextResponse.next();
    } else {
      console.log('[Middleware] Auth failed - status:', response.status);
      return NextResponse.redirect(new URL('/home', request.url));
    }
  } catch (error) {
    console.log('[Middleware] Auth check error:', error);
    return NextResponse.redirect(new URL('/home', request.url));
  }
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|mp4|webm|ogg)$).*)',
  ],
};

