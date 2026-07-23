/**
 * Temporary sample player data — for visually verifying the Players Performance
 * table against the mockup. NOT for production.
 *
 *   npx tsx scripts/sample-players.ts         # insert samples
 *   npx tsx scripts/sample-players.ts --clear  # remove them again
 */
import 'dotenv/config'
import { getPayload } from 'payload'
import config from '../src/payload.config'

const payload = await getPayload({ config })
const clear = process.argv.includes('--clear')

const SAMPLE_TAG = 'SAMPLE' // stored in a player field would be cleaner; we match by name list

const SAMPLES = [
  { name: 'Alberto Muller', teamSlug: 'apr-fc', position: 'CM', played: 24, goals: 17, assists: 2, clean: 0 },
  { name: 'Pablo Gomez', teamSlug: 'vipers-sc', position: 'CAM', played: 35, goals: 5, assists: 4, clean: 0 },
  { name: 'Alexandre Dupont', teamSlug: 'gor-mahia-fc', position: 'LB', played: 35, goals: 5, assists: 4, clean: 0 },
  { name: "Liam O'Connor", teamSlug: 'simba-sc', position: 'ST', played: 24, goals: 1, assists: 2, clean: 0 },
  { name: 'Rui Costa', teamSlug: 'rayon-sports-fc', position: 'ST', played: 24, goals: 1, assists: 2, clean: 0 },
  { name: 'Kwame Mensah', teamSlug: 'al-hilal-sc', position: 'GK', played: 22, goals: 0, assists: 0, clean: 9 },
  { name: 'Diego Fernandez', teamSlug: 'tusker-fc', position: 'GK', played: 20, goals: 0, assists: 0, clean: 7 },
]

const names = SAMPLES.map((s) => s.name)

// Always clear first so re-running never duplicates.
const existingPlayers = await payload.find({
  collection: 'players',
  where: { name: { in: names } },
  limit: 100,
})
for (const p of existingPlayers.docs) {
  const stats = await payload.find({
    collection: 'player-match-stats',
    where: { player: { equals: p.id } },
    limit: 100,
  })
  for (const s of stats.docs) {
    await payload.delete({ collection: 'player-match-stats', id: s.id })
  }
  await payload.delete({ collection: 'players', id: p.id })
}

if (clear) {
  console.log(`\x1b[33mCleared ${existingPlayers.docs.length} sample players.\x1b[0m`)
  process.exit(0)
}

// Insert fresh. Each sample is condensed into a single stat row carrying its
// season totals, which is enough to exercise the leaderboard rendering.
const teams = await payload.find({ collection: 'teams', limit: 100 })
const teamId = (slug: string) => teams.docs.find((t) => t.slug === slug)?.id
const anyMatch = (await payload.find({ collection: 'matches', limit: 1 })).docs[0]

for (const s of SAMPLES) {
  const tid = teamId(s.teamSlug)
  if (!tid || !anyMatch) continue
  const player = await payload.create({
    collection: 'players',
    data: { name: s.name, team: tid, position: s.position as 'CM' },
  })
  await payload.create({
    collection: 'player-match-stats',
    data: {
      player: player.id,
      match: anyMatch.id,
      goals: s.goals,
      assists: s.assists,
      cleanSheet: s.clean > 0,
      minutes: 90,
      yellowCards: 0,
      redCards: 0,
    },
  })
}

console.log(`\x1b[32mInserted ${SAMPLES.length} sample players.\x1b[0m Tag: ${SAMPLE_TAG}. Remove with --clear.`)
process.exit(0)
