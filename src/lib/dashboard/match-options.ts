/**
 * Client-safe copies of the option lists Matches.ts/Teams.ts/Players.ts
 * define for Payload. Deliberately duplicated rather than imported — those
 * collection files pull in `next/cache` (revalidatePath), which must never
 * end up in a client bundle. These are small, stable lists (one tournament's
 * venues/stages/countries/positions) so the duplication risk is low; if they
 * ever need to grow, factor the options into a `server-only`-free module.
 */
export const STAGES = [
  { label: 'Group Stage', value: 'group' },
  { label: 'Semi-Final', value: 'semi' },
  { label: 'Third Place', value: 'third' },
  { label: 'Final', value: 'final' },
] as const

export const VENUES = [
  { label: 'Amahoro Stadium', value: 'amahoro' },
  { label: 'Kigali Pele Stadium', value: 'pele' },
] as const

export const GROUPS = [
  { label: 'ITSINDA A', value: 'A' },
  { label: 'ITSINDA B', value: 'B' },
  { label: 'ITSINDA C', value: 'C' },
] as const

export const MATCH_STATUSES = [
  { label: 'Scheduled', value: 'scheduled' },
  { label: 'Live', value: 'live' },
  { label: 'Final', value: 'final' },
] as const

export const COMMENTARY_TYPES = [
  { label: 'General Update', value: 'note' },
  { label: 'Goal', value: 'goal' },
  { label: 'Yellow Card', value: 'yellow' },
  { label: 'Red Card', value: 'red' },
  { label: 'Substitution', value: 'substitution' },
  { label: 'Half Time', value: 'halftime' },
  { label: 'Second Half (Resume)', value: 'secondhalf' },
  { label: 'After the Match (Post-Match)', value: 'postmatch' },
] as const

/** Types that happen for one specific side, so they require a Team pick. */
export const TEAM_COMMENTARY_TYPES = ['goal', 'yellow', 'red', 'substitution']

export const COUNTRIES = [
  { label: 'Rwanda', value: 'RW' },
  { label: 'Uganda', value: 'UG' },
  { label: 'Kenya', value: 'KE' },
  { label: 'Tanzania', value: 'TZ' },
  { label: 'Zanzibar', value: 'ZNZ' },
  { label: 'Somalia', value: 'SO' },
  { label: 'South Sudan', value: 'SS' },
  { label: 'Sudan', value: 'SD' },
  { label: 'Djibouti', value: 'DJ' },
] as const

export const POSITIONS = [
  { label: 'Goalkeeper (GK)', value: 'GK' },
  { label: 'Centre-Back (CB)', value: 'CB' },
  { label: 'Left-Back (LB)', value: 'LB' },
  { label: 'Right-Back (RB)', value: 'RB' },
  { label: 'Defensive Midfielder (CDM)', value: 'CDM' },
  { label: 'Central Midfielder (CM)', value: 'CM' },
  { label: 'Attacking Midfielder (CAM)', value: 'CAM' },
  { label: 'Left Winger (LW)', value: 'LW' },
  { label: 'Right Winger (RW)', value: 'RW' },
  { label: 'Striker (ST)', value: 'ST' },
] as const

export const ARTICLE_VISIBILITY = [
  { label: 'Visible', value: 'visible' },
  { label: 'Hidden', value: 'hidden' },
] as const

export const GALLERY_CATEGORIES = [
  { label: 'Action', value: 'Action' },
  { label: 'Match Day', value: 'Match Day' },
  { label: 'Trophy', value: 'Trophy' },
  { label: 'Fans', value: 'Fans' },
  { label: 'Stadium', value: 'Stadium' },
  { label: 'APR FC', value: 'APR FC' },
] as const
