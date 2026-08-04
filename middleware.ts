import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

/**
 * Cheap, cookie-presence-only gate for `/dashboard/*`. This is NOT the
 * authority on whether the session is actually valid or what the user is
 * allowed to do — Edge middleware can't verify a Payload JWT against the DB
 * without an extra round trip, and Payload's local API isn't Edge-safe. The
 * real check is `requireDashboardUser()`/`requireCapability()` in
 * `src/lib/dashboard/auth.ts`, called from the protected layout and pages.
 * This layer only stops an unauthenticated request from ever rendering a
 * protected page.
 */
const PUBLIC_DASHBOARD_PATHS = ['/dashboard/login']

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (PUBLIC_DASHBOARD_PATHS.some((path) => pathname.startsWith(path))) {
    return NextResponse.next()
  }

  const hasSessionCookie = request.cookies.has('payload-token')
  if (!hasSessionCookie) {
    const loginUrl = new URL('/dashboard/login', request.url)
    loginUrl.searchParams.set('redirect', pathname)
    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/dashboard/:path*'],
}
