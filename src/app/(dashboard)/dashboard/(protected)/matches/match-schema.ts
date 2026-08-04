import { z } from 'zod'
import { kigaliLocalToISO } from '@/lib/dashboard/kigali-time'

/**
 * Mirrors the fields an editor actually touches live on the Matches
 * collection (src/collections/Matches.ts) — client-side validation only,
 * Payload's own hooks (e.g. "Final requires both scores") remain the source
 * of truth and still run server-side on every write.
 */
export const matchSchema = z
  .object({
    matchNumber: z.coerce.number().int().min(1).max(99),
    stage: z.enum(['group', 'semi', 'third', 'final']),
    group: z.enum(['A', 'B', 'C']).optional(),
    homeTeam: z.string().optional(),
    awayTeam: z.string().optional(),
    homeTeamPlaceholder: z.string().optional(),
    awayTeamPlaceholder: z.string().optional(),
    venue: z.enum(['amahoro', 'pele']),
    kickoff: z.string().min(1, 'Kick-off time is required'),
    status: z.enum(['scheduled', 'live', 'final']),
    manualScore: z.boolean(),
    homeScore: z.union([z.coerce.number().int().min(0), z.literal('')]).optional(),
    awayScore: z.union([z.coerce.number().int().min(0), z.literal('')]).optional(),
    liveMatchUrl: z.string().optional(),
    showLiveButton: z.boolean(),
  })
  .refine(
    (data) =>
      data.status !== 'final' ||
      (data.homeScore !== '' && data.homeScore != null && data.awayScore !== '' && data.awayScore != null),
    {
      message: 'A match marked Final must have both a home and away score.',
      path: ['homeScore'],
    },
  )

export type MatchFormValues = z.infer<typeof matchSchema>

/** `kickoffLocal` is the datetime-local field's raw value (Kigali wall time, no timezone). */
export function scoreEntryVisible(status: string, kickoffLocal: string): boolean {
  if (status === 'live' || status === 'final') return true
  if (!kickoffLocal) return false
  return new Date(kigaliLocalToISO(kickoffLocal)).getTime() <= Date.now()
}
