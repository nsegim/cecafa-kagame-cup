/**
 * Explicit field selection for dashboard match reads. Matches.ts carries a
 * legacy `commentary` array (with nested rich text + populated images) and a
 * `photos` array — exactly the "499 KB per busy fixture" cost the codebase's
 * own comments describe (see MatchCommentary/MatchPhotos). Payload's default
 * depth-1 read pulls all of that in for every row; `select` skips fetching
 * those fields entirely instead of just hiding them after the fact.
 */
export const MATCH_SELECT = {
  label: true,
  matchNumber: true,
  stage: true,
  group: true,
  homeTeam: true,
  awayTeam: true,
  homeTeamPlaceholder: true,
  awayTeamPlaceholder: true,
  venue: true,
  kickoff: true,
  status: true,
  manualScore: true,
  homeScore: true,
  awayScore: true,
  liveMatchUrl: true,
  showLiveButton: true,
} as const
