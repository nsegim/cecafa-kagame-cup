'use client'

import { MatchCenter } from './MatchCenter'
import { useLiveMatch } from './LiveMatchProvider'

/**
 * Feeds live polled state into the existing <MatchCenter>. MatchCenter keeps
 * its own tab state across re-renders, so the feed/stats/photos refresh in
 * place without the reader losing their tab.
 */
export function LiveMatchCenter({ homeName, awayName }: { homeName: string; awayName: string }) {
  const { events, photos, homeScore, awayScore, homeStats, awayStats } = useLiveMatch()

  return (
    <MatchCenter
      events={events}
      homeName={homeName}
      awayName={awayName}
      homeScore={homeScore}
      awayScore={awayScore}
      homeStats={homeStats}
      awayStats={awayStats}
      photos={photos}
    />
  )
}
