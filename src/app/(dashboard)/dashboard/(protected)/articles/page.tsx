import type { Metadata } from 'next'
import { requireCapability } from '@/lib/dashboard/auth'
import { can } from '@/lib/dashboard/permissions'
import { Header } from '@/components/dashboard/layout/header'
import { ArticlesTable } from './articles-table'

export const metadata: Metadata = { title: 'Articles' }

export default async function ArticlesPage() {
  const user = await requireCapability('articles:view')

  return (
    <>
      <Header title="Articles" description="External news links curated for the site." />
      <div className="flex-1 p-4 md:p-6">
        <ArticlesTable canManage={can(user, 'articles:edit')} />
      </div>
    </>
  )
}
