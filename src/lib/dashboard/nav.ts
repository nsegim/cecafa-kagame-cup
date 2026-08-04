import {
  LayoutDashboard,
  Trophy,
  Users2,
  Newspaper,
  Images,
  Video,
  Mail,
  UserCog,
  type LucideIcon,
} from 'lucide-react'
import { can, type Capability, type Role } from '@/lib/dashboard/permissions'

export interface NavItem {
  label: string
  href?: string
  icon: LucideIcon
  capability: Capability
  /** Rendered as a disabled row with a "Soon" badge — Phase 3+ on the roadmap. */
  soon?: boolean
}

export const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, capability: 'home:view' },
  // Live Commentary and Match Photos are match-scoped (Phase 2) — reached
  // from a fixture's own drawer, not a global unfiltered list, so they don't
  // get a top-level nav entry.
  { label: 'Matches', href: '/dashboard/matches', icon: Trophy, capability: 'matches:edit' },
  { label: 'Teams', href: '/dashboard/teams', icon: Users2, capability: 'teams:view' },
  { label: 'Articles', href: '/dashboard/articles', icon: Newspaper, capability: 'articles:view' },
  { label: 'Gallery', href: '/dashboard/gallery', icon: Images, capability: 'gallery:view' },
  { label: 'Videos', href: '/dashboard/videos', icon: Video, capability: 'videos:view' },
  { label: 'Subscribers', href: '/dashboard/subscribers', icon: Mail, capability: 'subscribers:view' },
  { label: 'Users', href: '/dashboard/users', icon: UserCog, capability: 'users:view' },
]

/** The first few items are what a mobile bottom bar has room for; the rest lives in the drawer. */
export const MOBILE_PRIMARY_COUNT = 3

/**
 * Filters NAV_ITEMS by role. Deliberately plain data in, plain data out with
 * icon components resolved from the client-side NAV_ITEMS constant — never
 * computed in a Server Component and passed down, since React can't
 * serialize a component reference across the server/client boundary. Only
 * `roles` (a string array) crosses that boundary; this filter then runs
 * inside the client Sidebar/MobileNav themselves.
 */
export function visibleNavItems(roles: Role[]): NavItem[] {
  return NAV_ITEMS.filter((item) => can({ roles }, item.capability))
}
