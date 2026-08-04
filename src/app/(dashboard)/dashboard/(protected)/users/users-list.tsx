'use client'

import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Plus, Pencil, Trash2, User as UserIcon } from 'lucide-react'
import { Button } from '@/components/dashboard/ui/button'
import { Badge } from '@/components/dashboard/ui/badge'
import { Skeleton } from '@/components/dashboard/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/dashboard/ui/table'
import { dashboardFetch } from '@/lib/dashboard/api-client'
import { ROLE_LABELS } from '@/lib/dashboard/role-labels'
import { UserDrawer } from './user-drawer'
import type { Role } from '@/lib/dashboard/permissions'

export interface DashboardUserRow {
  id: number
  email: string
  roles: Role[]
}

export function UsersList({ canManage, currentUserId }: { canManage: boolean; currentUserId: number }) {
  const queryClient = useQueryClient()
  const [drawerUser, setDrawerUser] = useState<DashboardUserRow | 'new' | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['dashboard-users'],
    queryFn: () => dashboardFetch<{ rows: DashboardUserRow[] }>('/api/dashboard/users'),
  })

  async function remove(user: DashboardUserRow) {
    if (!confirm(`Delete ${user.email}? This cannot be undone.`)) return
    try {
      await dashboardFetch(`/api/dashboard/users/${user.id}`, { method: 'DELETE' })
      toast.success('User deleted.')
      queryClient.invalidateQueries({ queryKey: ['dashboard-users'] })
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not delete the user.')
    }
  }

  return (
    <div className="grid gap-3">
      {canManage && (
        <div className="flex justify-end">
          <Button size="sm" onClick={() => setDrawerUser('new')}>
            <Plus className="size-4" /> New user
          </Button>
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Email</TableHead>
                <TableHead>Roles</TableHead>
                {canManage && <TableHead className="w-20" />}
              </TableRow>
            </TableHeader>
            {isLoading ? (
              <TableBody>
                {Array.from({ length: 4 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={3}><Skeleton className="h-6 w-full" /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            ) : (
              <TableBody>
                {(data?.rows ?? []).map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <span className="flex items-center gap-2 font-medium">
                        <UserIcon className="size-3.5 text-muted-foreground" />
                        {user.email}
                        {user.id === currentUserId && (
                          <Badge variant="secondary" className="text-[10px]">You</Badge>
                        )}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {user.roles.map((role) => (
                          <Badge key={role} variant="outline">{ROLE_LABELS[role]}</Badge>
                        ))}
                      </div>
                    </TableCell>
                    {canManage && (
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            aria-label="Edit roles"
                            onClick={() => setDrawerUser(user)}
                          >
                            <Pencil className="size-3.5" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            className="text-destructive"
                            aria-label="Delete"
                            disabled={user.id === currentUserId}
                            onClick={() => remove(user)}
                          >
                            <Trash2 className="size-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            )}
          </Table>
        </div>
      </div>

      <UserDrawer user={drawerUser} currentUserId={currentUserId} onClose={() => setDrawerUser(null)} />
    </div>
  )
}
