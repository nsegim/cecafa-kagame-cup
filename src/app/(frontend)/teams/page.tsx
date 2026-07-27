import type { Metadata } from 'next'
import { getTournamentData } from '@/lib/tournament'
import { StadiumHero } from '@/components/StadiumHero'
import { TeamsBoard } from '@/components/TeamsBoard'

export const revalidate = 300

const DESCRIPTION = 'All twelve clubs competing at the CECAFA Kagame Cup 2026, by group.'

export const metadata: Metadata = {
  title: 'Teams',
  description: DESCRIPTION,
  alternates: { canonical: '/teams' },
  openGraph: { title: 'Teams', description: DESCRIPTION, url: '/teams' },
}

export default async function TeamsPage() {
  const data = await getTournamentData()

  return (
    <>
      <StadiumHero kicker="Kagame interclub Cup 2026" title="AMAKIPE YOSE" />
      <section className="section teams-section">
        <div className="container">
          <TeamsBoard teams={data.teams} tables={data.tables} />
        </div>
      </section>
    </>
  )
}
