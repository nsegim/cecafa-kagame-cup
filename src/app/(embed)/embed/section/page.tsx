import type { Metadata } from 'next'
import { getSectionData } from '@/lib/section'
import { SectionEmbed } from '@/components/embed/SectionEmbed'
import './section-embed.css'

// Server-render the initial data fast; the client widget then polls for
// real-time updates. Short ISR window keeps even the first paint fresh.
export const revalidate = 60

export const metadata: Metadata = {
  title: 'CECAFA Kagame Cup 2026 — News & Fixtures',
  robots: { index: false, follow: false },
}

export default async function SectionEmbedPage() {
  const data = await getSectionData()
  return <SectionEmbed initial={data} />
}
