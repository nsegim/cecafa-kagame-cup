import type { Role } from '@/collections/Users'

export type { Role }

/**
 * Every gated action in the dashboard, mapped to which roles may perform it.
 * `moderator` maps to "live-blogging a match": full write on Matches/
 * Commentary/Photos (the time-critical path), read-only everywhere else.
 * `manager` is content ops. `admin` is manager + Subscribers visibility +
 * fixture create/delete. `super_admin` is the only role that can touch Users
 * or the legacy /admin fallback.
 */
export const CAPABILITY_ROLES = {
  'home:view': ['super_admin', 'admin', 'manager', 'moderator'],

  'matches:edit': ['super_admin', 'admin', 'manager', 'moderator'],
  'matches:manage': ['super_admin', 'admin'],

  'commentary:edit': ['super_admin', 'admin', 'manager', 'moderator'],
  'photos:edit': ['super_admin', 'admin', 'manager', 'moderator'],

  'players:view': ['super_admin', 'admin', 'manager', 'moderator'],
  'players:editStats': ['super_admin', 'admin', 'manager', 'moderator'],
  'players:manage': ['super_admin', 'admin', 'manager'],

  'teams:view': ['super_admin', 'admin', 'manager', 'moderator'],
  'teams:edit': ['super_admin', 'admin', 'manager'],
  'teams:delete': ['super_admin', 'admin'],

  'articles:view': ['super_admin', 'admin', 'manager', 'moderator'],
  'articles:edit': ['super_admin', 'admin', 'manager'],

  'gallery:view': ['super_admin', 'admin', 'manager', 'moderator'],
  'gallery:edit': ['super_admin', 'admin', 'manager'],

  'videos:view': ['super_admin', 'admin', 'manager', 'moderator'],
  'videos:edit': ['super_admin', 'admin', 'manager'],

  'subscribers:view': ['super_admin', 'admin'],
  'subscribers:manage': ['super_admin'],

  'users:view': ['super_admin', 'admin'],
  'users:manage': ['super_admin'],

  'admin:access': ['super_admin'],
} as const satisfies Record<string, readonly Role[]>

export type Capability = keyof typeof CAPABILITY_ROLES

type PermissibleUser = { roles?: Role[] | null } | null | undefined

/** Whether `user` holds a role allowed to perform `capability`. */
export function can(user: PermissibleUser, capability: Capability): boolean {
  const roles = user?.roles ?? []
  return CAPABILITY_ROLES[capability].some((allowed) => roles.includes(allowed))
}

export function isSuperAdmin(user: PermissibleUser): boolean {
  return Boolean(user?.roles?.includes('super_admin'))
}
