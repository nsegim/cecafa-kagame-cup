import type { Metadata } from 'next'
import { requireCapability } from '@/lib/dashboard/auth'
import { can } from '@/lib/dashboard/permissions'
import { Header } from '@/components/dashboard/layout/header'
import { UsersList } from './users-list'

export const metadata: Metadata = { title: 'Users' }

export default async function UsersPage() {
  const user = await requireCapability('users:view')

  return (
    <>
      <Header title="Users" description="Dashboard accounts and their roles." />
      <div className="flex-1 p-4 md:p-6">
        <UsersList canManage={can(user, 'users:manage')} currentUserId={user.id} />
      </div>
    </>
  )
}
