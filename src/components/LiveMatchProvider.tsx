'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import type { LiveMatchData } from '@/lib/matchStats'

const LiveMatchContext = createContext<LiveMatchData | null>(null)

export function useLiveMatch(): LiveMatchData {
  const ctx = useContext(LiveMatchContext)
  if (!ctx) throw new Error('useLiveMatch must be used within <LiveMatchProvider>')
  return ctx
}

const DEFAULT_POLL_MS = 15_000

/** A fixture this close to kickoff is worth polling — the feed can start at any moment. */
const KICKOFF_SOON_MS = 30 * 60 * 1000

/**
 * Seeds live match state from the server render, then polls the match's
 * `/live` endpoint while the game can still change.
 *
 * WHETHER to poll is decided HERE, not on the server. The match pages are
 * prerendered (`generateStaticParams` + `revalidate`), so anything the server
 * computes from `Date.now()` is frozen into the cached HTML: a page built
 * hours before kickoff baked in "don't poll", and kept saying so until its ISR
 * window happened to lapse — the live feed could start minutes late. Deciding
 * in this effect evaluates the clock in the reader's browser at mount, which is
 * both correct and what the `react-hooks/purity` lint rule was pointing at.
 *
 * Polling stops the moment a poll returns `final`, since a result is frozen. A
 * transient network error just retries on the next tick without disturbing the
 * last good scoreline.
 */
export function LiveMatchProvider({
  matchId,
  initial,
  kickoff,
  pollMs = DEFAULT_POLL_MS,
  children,
}: {
  matchId: number
  initial: LiveMatchData
  /** ISO kickoff time — used to decide whether this fixture is worth polling yet. */
  kickoff: string
  pollMs?: number
  children: React.ReactNode
}) {
  const [data, setData] = useState<LiveMatchData>(initial)

  useEffect(() => {
    // A finished result never changes again.
    if (initial.status === 'final') return
    // A fixture still days away would just be pointless load on the origin.
    const startsSoon = new Date(kickoff).getTime() - Date.now() < KICKOFF_SOON_MS
    if (initial.status !== 'live' && !startsSoon) return

    let cancelled = false
    let timer: ReturnType<typeof setTimeout>

    const tick = async () => {
      try {
        // `no-cache`, NOT `no-store`: both bypass a stale reuse, but `no-store`
        // also suppresses the conditional request, so the browser could never
        // send `If-None-Match` and every poll re-downloaded a feed it already
        // had. With `no-cache` an unchanged feed comes back as an empty 304.
        const res = await fetch(`/matches/${matchId}/live`, { cache: 'no-cache' })
        if (!cancelled && res.ok) {
          const next = (await res.json()) as LiveMatchData
          setData(next)
          if (next.status === 'final') return // result is in — stop polling
        }
      } catch {
        // Transient blip — keep the last good data and try again next tick.
      }
      if (!cancelled) timer = setTimeout(tick, pollMs)
    }

    timer = setTimeout(tick, pollMs)
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [matchId, pollMs, kickoff, initial.status])

  return <LiveMatchContext.Provider value={data}>{children}</LiveMatchContext.Provider>
}
