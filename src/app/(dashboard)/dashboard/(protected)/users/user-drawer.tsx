'use client'

import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from '@/components/dashboard/ui/sheet'
import { Button } from '@/components/dashboard/ui/button'
import { Input } from '@/components/dashboard/ui/input'
import { Label } from '@/components/dashboard/ui/label'
import { Checkbox } from '@/components/dashboard/ui/checkbox'
import { dashboardFetch } from '@/lib/dashboard/api-client'
import { ROLES } from '@/collections/Users'
import type { Role } from '@/lib/dashboard/permissions'
import type { DashboardUserRow } from './users-list'

export function UserDrawer({
  user,
  currentUserId,
  onClose,
}: {
  user: DashboardUserRow | 'new' | null
  currentUserId: number
  onClose: () => void
}) {
  const open = user !== null
  const isNew = user === 'new'
  const existing = isNew ? null : user

  return (
    <Sheet open={open} onOpenChange={(next) => !next && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle>{isNew ? 'New user' : existing?.email}</SheetTitle>
          <SheetDescription>
            {isNew ? 'Create a dashboard account and assign its roles.' : 'Roles control what this account can see and do.'}
          </SheetDescription>
        </SheetHeader>
        {open && (
          <UserForm
            key={existing?.id ?? 'new'}
            isNew={isNew}
            existing={existing}
            currentUserId={currentUserId}
            onClose={onClose}
          />
        )}
      </SheetContent>
    </Sheet>
  )
}

function UserForm({
  isNew,
  existing,
  currentUserId,
  onClose,
}: {
  isNew: boolean
  existing: DashboardUserRow | null
  currentUserId: number
  onClose: () => void
}) {
  const queryClient = useQueryClient()

  const [email, setEmail] = useState(existing?.email ?? '')
  const [password, setPassword] = useState('')
  const [roles, setRoles] = useState<Role[]>(existing?.roles ?? ['moderator'])

  const isSelf = existing?.id === currentUserId

  function toggleRole(role: Role) {
    setRoles((prev) => (prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role]))
  }

  const saveMutation = useMutation({
    mutationFn: () =>
      isNew
        ? dashboardFetch('/api/dashboard/users', {
            method: 'POST',
            body: JSON.stringify({ email, password, roles }),
          })
        : dashboardFetch(`/api/dashboard/users/${existing!.id}`, {
            method: 'PATCH',
            body: JSON.stringify({ roles }),
          }),
    onSuccess: () => {
      toast.success(isNew ? 'User created.' : 'Roles updated.')
      queryClient.invalidateQueries({ queryKey: ['dashboard-users'] })
      onClose()
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Could not save the user.'),
  })

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        saveMutation.mutate()
      }}
      className="grid gap-4 px-4 pb-4"
    >
      {isNew && (
        <>
          <div className="grid gap-1.5">
            <Label className="text-xs text-muted-foreground">Email</Label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div className="grid gap-1.5">
            <Label className="text-xs text-muted-foreground">Temporary password</Label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              autoComplete="new-password"
            />
          </div>
        </>
      )}

      <div className="grid gap-2">
        <Label className="text-xs text-muted-foreground">Roles</Label>
        {ROLES.map((r) => (
          <label key={r.value} className="flex items-center gap-2 text-sm">
            <Checkbox
              checked={roles.includes(r.value)}
              onCheckedChange={() => toggleRole(r.value)}
              disabled={isSelf && r.value === 'super_admin' && roles.length === 1}
            />
            {r.label}
          </label>
        ))}
        {isSelf && (
          <p className="text-xs text-muted-foreground">
            You&apos;re editing your own account — the server also blocks removing your last Super Admin role.
          </p>
        )}
      </div>

      <SheetFooter className="px-0">
        <Button type="submit" disabled={saveMutation.isPending || roles.length === 0}>
          {saveMutation.isPending ? 'Saving…' : isNew ? 'Create user' : 'Save roles'}
        </Button>
      </SheetFooter>
    </form>
  )
}
