import type { Metadata } from 'next'
import { requireCapability } from '@/lib/dashboard/auth'
import { can } from '@/lib/dashboard/permissions'
import { Header } from '@/components/dashboard/layout/header'
import { HeroBannerPanel } from './hero-banner-panel'
import { GalleryTable } from './gallery-table'

export const metadata: Metadata = { title: 'Gallery' }

export default async function GalleryPage() {
  const user = await requireCapability('gallery:view')
  const canManage = can(user, 'gallery:edit')

  return (
    <>
      <Header title="Gallery" description="Cover albums shown on the public /gallery page." />
      <div className="grid flex-1 gap-4 p-4 md:p-6">
        <HeroBannerPanel canManage={canManage} />
        <GalleryTable canManage={canManage} />
      </div>
    </>
  )
}
