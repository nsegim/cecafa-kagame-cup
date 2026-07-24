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

/**
 * Seeds live match state from the server render, then polls the match's
 * `/live` endpoint while the game can still change. Polling only runs when
 * `enabled` (the server decides this — a live or about-to-kick-off match), and
 * stops the moment a poll returns `final`, since a result is frozen. A
 * transient network error just retries on the next tick without disturbing the
 * last good scoreline.
 */
export function LiveMatchProvider({
  matchId,
  initial,
  enabled = true,
  pollMs = DEFAULT_POLL_MS,
  children,
}: {
  matchId: number
  initial: LiveMatchData
  enabled?: boolean
  pollMs?: number
  children: React.ReactNode
}) {
  const [data, setData] = useState<LiveMatchData>(initial)

  useEffect(() => {
    if (!enabled || initial.status === 'final') return
    let cancelled = false
    let timer: ReturnType<typeof setTimeout>

    const tick = async () => {
      try {
        const res = await fetch(`/matches/${matchId}/live`, { cache: 'no-store' })
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
  }, [matchId, pollMs, enabled, initial.status])

  return <LiveMatchContext.Provider value={data}>{children}</LiveMatchContext.Provider>
}
