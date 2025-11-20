/**
 * Shared authentication utilities
 * Can be used in both client-side (Redux) and server-side (middleware) contexts
 */

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

export const AUTH_ENDPOINTS = {
  ME: '/auth/me',
  LOGIN: '/auth/login',
  LOGOUT: '/auth/logout',
  SIGNUP: '/auth/signup',
  REFRESH_TOKEN: '/auth/refresh-token',
} as const;

/**
 * Verify authentication by calling /auth/me endpoint
 * This matches the getUser thunk from authSlice
 * @param cookieHeader - Cookie header string from the request
 * @returns Promise<boolean> - true if authenticated, false otherwise
 */
export async function verifyAuth(cookieHeader: string | null): Promise<boolean> {
  if (!cookieHeader) return false;

  try {
    const response = await fetch(`${API_BASE_URL}${AUTH_ENDPOINTS.ME}`, {
      method: 'GET',
      headers: {
        Cookie: cookieHeader,
        'Content-Type': 'application/json',
      },
      credentials: 'include',
    });

    return response.ok;
  } catch (error) {
    console.error('Auth verification failed:', error);
    return false;
  }
}

