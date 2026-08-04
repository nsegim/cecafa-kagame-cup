import type { Role } from '@/lib/dashboard/permissions'

export const ROLE_LABELS: Record<Role, string> = {
  super_admin: 'Super Admin',
  admin: 'Admin',
  manager: 'Manager',
  moderator: 'Moderator',
}
