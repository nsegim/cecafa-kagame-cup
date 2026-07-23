import { getTournamentData } from '@/lib/tournament'
import { StadiumHero } from '@/components/StadiumHero'
import { TeamsBoard } from '@/components/TeamsBoard'

export const revalidate = 300

export const metadata = {
  title: 'Teams — CECAFA Kagame Cup 2026 | IGIHE',
  description: 'All twelve clubs competing at the CECAFA Kagame Cup 2026, by group.',
}

export default async function TeamsPage() {
  const data = await getTournamentData()

  return (
    <>
      <StadiumHero kicker="Kagame interclub Cup 2025" title="All Teams" />
      <section className="section teams-section">
        <div className="container">
          <TeamsBoard teams={data.teams} tables={data.tables} />
        </div>
      </section>
    </>
  )
}
