import type { Metadata } from 'next'
import { requireCapability } from '@/lib/dashboard/auth'
import { can } from '@/lib/dashboard/permissions'
import { Header } from '@/components/dashboard/layout/header'
import { VideosTable } from './videos-table'

export const metadata: Metadata = { title: 'Videos' }

export default async function VideosPage() {
  const user = await requireCapability('videos:view')

  return (
    <>
      <Header title="Videos" description="Clips shown in the homepage Highlights carousel." />
      <div className="flex-1 p-4 md:p-6">
        <VideosTable canManage={can(user, 'videos:edit')} />
      </div>
    </>
  )
}
