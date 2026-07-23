/**
 * Seeds the tournament: 12 clubs, 3 groups, all 22 fixtures.
 *
 *   npm run seed
 *
 * Idempotent — re-running updates existing records rather than duplicating
 * them, so it is safe to run again after a fixture change.
 */
import 'dotenv/config'
import { getPayload } from 'payload'
import config from '../payload.config'
import { FIXTURE_SEED, TEAM_SEED } from './data'

const payload = await getPayload({ config })

console.log('\n\x1b[1mSeeding CECAFA Kagame Cup 2026\x1b[0m\n')

// --- Admin user -------------------------------------------------------------
const ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL ?? 'support@igihe.rw'
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD ?? 'KagameCup2026!'

const existingUsers = await payload.count({ collection: 'users' })
if (existingUsers.totalDocs === 0) {
  await payload.create({
    collection: 'users',
    data: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD },
  })
  console.log(`  admin created: ${ADMIN_EMAIL}`)
  console.log(`  password:      ${ADMIN_PASSWORD}   \x1b[33m<- change this after first login\x1b[0m`)
} else {
  console.log(`  admin already exists (${existingUsers.totalDocs} user(s)) — skipped`)
}

// --- Teams ------------------------------------------------------------------
// Postgres primary keys are numeric.
const teamIdBySlug = new Map<string, number>()

for (const team of TEAM_SEED) {
  const existing = await payload.find({
    collection: 'teams',
    where: { slug: { equals: team.slug } },
    limit: 1,
  })

  if (existing.docs.length > 0) {
    const updated = await payload.update({
      collection: 'teams',
      id: existing.docs[0].id,
      data: { ...team },
    })
    teamIdBySlug.set(team.slug, updated.id)
  } else {
    const created = await payload.create({ collection: 'teams', data: { ...team } })
    teamIdBySlug.set(team.slug, created.id)
  }
}
console.log(`  teams:   ${teamIdBySlug.size} clubs across groups A, B, C`)

// --- Fixtures ---------------------------------------------------------------
let created = 0
let updated = 0

for (const f of FIXTURE_SEED) {
  const data = {
    matchNumber: f.matchNumber,
    stage: f.stage,
    group: f.group ?? null,
    homeTeam: f.home ? (teamIdBySlug.get(f.home) ?? null) : null,
    awayTeam: f.away ? (teamIdBySlug.get(f.away) ?? null) : null,
    homeTeamPlaceholder:
      f.homePlaceholder ?? (f.home ? TEAM_SEED.find((t) => t.slug === f.home)!.name : null),
    awayTeamPlaceholder:
      f.awayPlaceholder ?? (f.away ? TEAM_SEED.find((t) => t.slug === f.away)!.name : null),
    venue: f.venue,
    kickoff: f.kickoff,
    status: 'scheduled' as const,
  }

  const existing = await payload.find({
    collection: 'matches',
    where: { matchNumber: { equals: f.matchNumber } },
    limit: 1,
  })

  if (existing.docs.length > 0) {
    await payload.update({ collection: 'matches', id: existing.docs[0].id, data })
    updated++
  } else {
    await payload.create({ collection: 'matches', data })
    created++
  }
}

console.log(`  matches: ${created} created, ${updated} updated (22 total)`)

// --- Summary ----------------------------------------------------------------
const groups = await Promise.all(
  (['A', 'B', 'C'] as const).map(async (g) => {
    const r = await payload.find({ collection: 'teams', where: { group: { equals: g } }, limit: 10 })
    return `  Group ${g}: ${r.docs.map((d) => d.name).join(', ')}`
  }),
)
console.log()
groups.forEach((g) => console.log(g))

const firstMatch = await payload.find({
  collection: 'matches',
  sort: 'kickoff',
  limit: 1,
})
if (firstMatch.docs[0]) {
  const m = firstMatch.docs[0]
  console.log(
    `\n  First kick-off: ${new Date(m.kickoff).toLocaleString('en-GB', { timeZone: 'Africa/Kigali' })} (Kigali)`,
  )
}

console.log('\n\x1b[32m\x1b[1mSeed complete.\x1b[0m\n')
process.exit(0)
