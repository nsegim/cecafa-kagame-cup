'use client'

import { useLiveMatch } from './LiveMatchProvider'

/**
 * The hero scoreline + status pill, driven by live polled state. `scheduledLabel`
 * is the kick-off time to show before the match is played (computed on the
 * server so the timezone formatting matches the rest of the page).
 */
export function LiveScore({ scheduledLabel }: { scheduledLabel: string }) {
  const { status, homeScore, awayScore } = useLiveMatch()
  const played = status !== 'scheduled'
  const statusLabel = status === 'live' ? 'Live' : status === 'final' ? 'FT' : scheduledLabel

  return (
    <div className="match-hero__score">
      <span className={`match-hero__status ${status === 'live' ? 'is-live' : ''}`}>
        {statusLabel}
      </span>
      <div className="match-hero__nums">
        <span>{played ? homeScore : '–'}</span>
        <span className="match-hero__colon">:</span>
        <span>{played ? awayScore : '–'}</span>
      </div>
    </div>
  )
}
