import type { CollectionConfig } from 'payload'

export const ROLES = [
  { label: 'Super Admin', value: 'super_admin' },
  { label: 'Admin', value: 'admin' },
  { label: 'Manager', value: 'manager' },
  { label: 'Moderator', value: 'moderator' },
] as const

export type Role = (typeof ROLES)[number]['value']

export const Users: CollectionConfig = {
  slug: 'users',
  admin: {
    useAsTitle: 'email',
  },
  auth: true,
  access: {
    // /dashboard is the primary interface now — /admin stays live only as a
    // super_admin fallback during the transition (see
    // src/lib/dashboard/permissions.ts for the full role matrix).
    admin: ({ req }) => Boolean(req.user?.roles?.includes('super_admin')),
  },
  fields: [
    // Email added by default
    {
      name: 'roles',
      type: 'select',
      hasMany: true,
      required: true,
      // New users default to least-privilege. Existing users are backfilled to
      // super_admin by src/scripts/backfill-user-roles.ts — this defaultValue
      // does NOT retroactively apply to rows that already exist in Postgres.
      defaultValue: ['moderator'],
      options: [...ROLES],
      admin: {
        position: 'sidebar',
        description: 'Controls what this user can see and do in /dashboard and /admin.',
      },
      access: {
        // Only a super_admin may change anyone's roles — otherwise any user
        // could grant themselves admin via a plain "update" on their own doc.
        update: ({ req }) => Boolean(req.user?.roles?.includes('super_admin')),
      },
    },
  ],
  versions: false,
}
