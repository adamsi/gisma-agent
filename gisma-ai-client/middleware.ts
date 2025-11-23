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
  const cookies = request.headers.get('cookie') || '';
  
  try {
    const response = await fetch(`${API_BASE_URL}${AUTH_ENDPOINT}`, {
      headers: {
        Cookie: cookies,
      },
      credentials: 'include',
    });

    // If authenticated, allow access
    if (response.ok) {
      console.log('[Middleware] Auth successful - status:', response.status);
      return NextResponse.next();
    }
    
    console.log('[Middleware] Auth failed - status:', response.status);
  } catch (error) {
    // If auth check fails, redirect to home
    console.error('[Middleware] Auth check error:', error);
  }

  // Redirect unauthenticated users to home
  return NextResponse.redirect(new URL('/home', request.url));
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|mp4|webm|ogg)$).*)',
  ],
};

