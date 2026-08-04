import { headers as nextHeaders } from 'next/headers'
import { redirect } from 'next/navigation'
import { NextResponse } from 'next/server'
import { getPayloadClient } from '@/lib/payload'
import type { User } from '@/payload-types'
import { can, type Capability } from '@/lib/dashboard/permissions'

/**
 * Resolves the current dashboard user from Payload's own `payload-token`
 * cookie via the local API — no parallel auth system, no extra network hop
 * (the local API resolves in-process, unlike a self-fetch of /api/users/me).
 */
export async function getDashboardUser(): Promise<User | null> {
  const payload = await getPayloadClient()
  const headersList = await nextHeaders()
  const { user } = await payload.auth({ headers: headersList })
  return (user as User | null) ?? null
}

/** Redirects to the login screen if no session is present. */
export async function requireDashboardUser(): Promise<User> {
  const user = await getDashboardUser()
  if (!user) redirect('/dashboard/login')
  return user
}

/**
 * Redirects to login if unauthenticated, or back to the dashboard home (with
 * a flag the home page surfaces as a toast) if authenticated but lacking the
 * given capability. Use at the top of any page/route that needs more than
 * plain "is logged in".
 */
export async function requireCapability(capability: Capability): Promise<User> {
  const user = await requireDashboardUser()
  if (!can(user, capability)) redirect('/dashboard?forbidden=1')
  return user
}

/**
 * Route Handler variant — `redirect()` is a Server Component/Action primitive
 * and doesn't produce a sane response for a `fetch()`-based API caller. Returns
 * a ready-to-return NextResponse on failure so a route handler can early-out
 * with `const { user, response } = await apiCapability(...); if (response) return response`.
 */
export async function apiCapability(
  capability: Capability,
): Promise<{ user: User; response: null } | { user: null; response: NextResponse }> {
  const user = await getDashboardUser()
  if (!user) {
    return { user: null, response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  }
  if (!can(user, capability)) {
    return { user: null, response: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }
  }
  return { user, response: null }
}
