'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { LogOut } from 'lucide-react'
import { toast } from 'sonner'
import { Avatar, AvatarFallback } from '@/components/dashboard/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/dashboard/ui/dropdown-menu'
import { ROLE_LABELS } from '@/lib/dashboard/role-labels'
import type { Role } from '@/lib/dashboard/permissions'

function initialsFor(email: string) {
  const local = email.split('@')[0] ?? email
  const parts = local.split(/[._-]/).filter(Boolean)
  const chars = parts.length > 1 ? [parts[0][0], parts[1][0]] : [local[0], local[1] ?? '']
  return chars.join('').toUpperCase()
}

export function UserMenu({
  email,
  roles,
  collapsed = false,
}: {
  email: string
  roles: Role[]
  collapsed?: boolean
}) {
  const router = useRouter()
  const [signingOut, setSigningOut] = useState(false)

  async function signOut() {
    setSigningOut(true)
    try {
      await fetch('/api/users/logout', { method: 'POST', credentials: 'include' })
      router.push('/dashboard/login')
      router.refresh()
    } catch {
      toast.error('Could not sign out — try again.')
      setSigningOut(false)
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left hover:bg-muted"
        >
          <Avatar size="sm">
            <AvatarFallback>{initialsFor(email)}</AvatarFallback>
          </Avatar>
          {!collapsed && (
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{email}</p>
              <p className="truncate text-xs text-muted-foreground">
                {roles.map((r) => ROLE_LABELS[r]).join(', ')}
              </p>
            </div>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="font-normal">
          <p className="truncate text-sm font-medium">{email}</p>
          <p className="truncate text-xs text-muted-foreground">
            {roles.map((r) => ROLE_LABELS[r]).join(', ')}
          </p>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" disabled={signingOut} onClick={signOut}>
          <LogOut className="size-4" />
          {signingOut ? 'Signing out…' : 'Sign out'}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
