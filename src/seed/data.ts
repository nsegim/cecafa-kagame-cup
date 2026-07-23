/**
 * CECAFA Kagame Cup 2026 — Rwanda. 24 July to 7 August 2026.
 * Source: official CECAFA fixture sheet.
 *
 * Kickoff times are Kigali local (CAT, UTC+2).
 */

export const TEAM_SEED = [
  // Group A
  { name: 'APR FC', slug: 'apr-fc', shortName: 'APR', country: 'RW', group: 'A' },
  { name: 'Vipers SC', slug: 'vipers-sc', shortName: 'VIP', country: 'UG', group: 'A' },
  { name: 'Gor Mahia FC', slug: 'gor-mahia-fc', shortName: 'GOR', country: 'KE', group: 'A' },
  {
    name: 'Garde Républicaine FC',
    slug: 'garde-republicaine-fc',
    shortName: 'GR',
    country: 'RW',
    group: 'A',
  },

  // Group B
  { name: 'Simba SC', slug: 'simba-sc', shortName: 'SIM', country: 'TZ', group: 'B' },
  {
    name: 'Mogadishu City Club',
    slug: 'mogadishu-city-club',
    shortName: 'MCC',
    country: 'SO',
    group: 'B',
  },
  {
    name: 'Singida Black Stars FC',
    slug: 'singida-black-stars-fc',
    shortName: 'SBS',
    country: 'TZ',
    group: 'B',
  },
  { name: 'Jamus FC', slug: 'jamus-fc', shortName: 'JAM', country: 'SS', group: 'B' },

  // Group C
  { name: 'Rayon Sports FC', slug: 'rayon-sports-fc', shortName: 'RAY', country: 'RW', group: 'C' },
  { name: 'KVZ SC', slug: 'kvz-sc', shortName: 'KVZ', country: 'ZNZ', group: 'C' },
  { name: 'Al Hilal SC', slug: 'al-hilal-sc', shortName: 'HIL', country: 'SD', group: 'C' },
  { name: 'Tusker FC', slug: 'tusker-fc', shortName: 'TUS', country: 'KE', group: 'C' },
] as const

export interface FixtureSeed {
  matchNumber: number
  stage: 'group' | 'semi' | 'third' | 'final'
  group?: 'A' | 'B' | 'C'
  home?: string
  away?: string
  homePlaceholder?: string
  awayPlaceholder?: string
  venue: 'amahoro' | 'pele'
  kickoff: string
  /** Kickoff not yet confirmed by CECAFA — shown as TBC on the fixture sheet. */
  timeTBC?: boolean
}

export const FIXTURE_SEED: FixtureSeed[] = [
  // ---- Match Day 1 ----
  { matchNumber: 1, stage: 'group', group: 'A', home: 'vipers-sc', away: 'garde-republicaine-fc', venue: 'amahoro', kickoff: '2026-07-24T15:00:00+02:00' },
  { matchNumber: 2, stage: 'group', group: 'A', home: 'apr-fc', away: 'gor-mahia-fc', venue: 'amahoro', kickoff: '2026-07-24T19:00:00+02:00' },
  { matchNumber: 3, stage: 'group', group: 'B', home: 'simba-sc', away: 'mogadishu-city-club', venue: 'pele', kickoff: '2026-07-25T18:00:00+02:00' },
  { matchNumber: 4, stage: 'group', group: 'B', home: 'singida-black-stars-fc', away: 'jamus-fc', venue: 'pele', kickoff: '2026-07-25T15:00:00+02:00' },
  { matchNumber: 5, stage: 'group', group: 'C', home: 'rayon-sports-fc', away: 'kvz-sc', venue: 'amahoro', kickoff: '2026-07-26T18:00:00+02:00' },
  { matchNumber: 6, stage: 'group', group: 'C', home: 'al-hilal-sc', away: 'tusker-fc', venue: 'amahoro', kickoff: '2026-07-26T15:00:00+02:00' },

  // ---- Match Day 2 ----
  { matchNumber: 7, stage: 'group', group: 'A', home: 'garde-republicaine-fc', away: 'apr-fc', venue: 'pele', kickoff: '2026-07-27T18:00:00+02:00' },
  { matchNumber: 8, stage: 'group', group: 'A', home: 'gor-mahia-fc', away: 'vipers-sc', venue: 'pele', kickoff: '2026-07-27T15:00:00+02:00' },
  { matchNumber: 9, stage: 'group', group: 'B', home: 'mogadishu-city-club', away: 'singida-black-stars-fc', venue: 'pele', kickoff: '2026-07-28T15:00:00+02:00' },
  { matchNumber: 10, stage: 'group', group: 'B', home: 'jamus-fc', away: 'simba-sc', venue: 'pele', kickoff: '2026-07-28T18:00:00+02:00' },
  { matchNumber: 11, stage: 'group', group: 'C', home: 'kvz-sc', away: 'al-hilal-sc', venue: 'pele', kickoff: '2026-07-29T15:00:00+02:00' },
  { matchNumber: 12, stage: 'group', group: 'C', home: 'tusker-fc', away: 'rayon-sports-fc', venue: 'pele', kickoff: '2026-07-29T18:00:00+02:00' },

  // ---- Match Day 3 ----
  { matchNumber: 13, stage: 'group', group: 'A', home: 'apr-fc', away: 'vipers-sc', venue: 'amahoro', kickoff: '2026-07-30T19:00:00+02:00' },
  { matchNumber: 14, stage: 'group', group: 'A', home: 'gor-mahia-fc', away: 'garde-republicaine-fc', venue: 'pele', kickoff: '2026-07-30T19:00:00+02:00' },
  { matchNumber: 15, stage: 'group', group: 'B', home: 'singida-black-stars-fc', away: 'simba-sc', venue: 'amahoro', kickoff: '2026-07-31T19:00:00+02:00' },
  { matchNumber: 16, stage: 'group', group: 'B', home: 'jamus-fc', away: 'mogadishu-city-club', venue: 'pele', kickoff: '2026-07-31T19:00:00+02:00' },
  { matchNumber: 17, stage: 'group', group: 'C', home: 'al-hilal-sc', away: 'rayon-sports-fc', venue: 'amahoro', kickoff: '2026-08-01T19:00:00+02:00' },
  { matchNumber: 18, stage: 'group', group: 'C', home: 'tusker-fc', away: 'kvz-sc', venue: 'pele', kickoff: '2026-08-01T19:00:00+02:00' },

  // ---- Semi-finals (4 Aug) — kickoff times TBC on the official sheet ----
  { matchNumber: 19, stage: 'semi', homePlaceholder: 'Winner Gr. B', awayPlaceholder: 'Winner Gr. C', venue: 'pele', kickoff: '2026-08-04T16:00:00+02:00', timeTBC: true },
  { matchNumber: 20, stage: 'semi', homePlaceholder: 'Winner Gr. A', awayPlaceholder: 'Best Runner-Up', venue: 'pele', kickoff: '2026-08-04T19:00:00+02:00', timeTBC: true },

  // ---- Third place & Final (7 Aug) ----
  { matchNumber: 21, stage: 'third', homePlaceholder: 'Loser M19', awayPlaceholder: 'Loser M20', venue: 'amahoro', kickoff: '2026-08-07T15:00:00+02:00' },
  { matchNumber: 22, stage: 'final', homePlaceholder: 'Winner M19', awayPlaceholder: 'Winner M20', venue: 'amahoro', kickoff: '2026-08-07T19:00:00+02:00' },
]
