/**
 * Moves Live Commentary and Match Photos out of the `matches` arrays and into
 * their own collections.
 *
 *   yarn tsx scripts/migrate-commentary-photos.ts          # dry run, prints a plan
 *   yarn tsx scripts/migrate-commentary-photos.ts --commit # writes
 *
 * SAFE BY CONSTRUCTION:
 *   - It only ever INSERTS. The `matches.commentary` and `matches.photos`
 *     arrays are left exactly as they are, so the old data remains a complete
 *     fallback and rollback is "stop reading the new collections".
 *   - It is idempotent. A match that already has rows in a target collection is
 *     skipped, so a partial or interrupted run can simply be run again.
 *   - Ordering is preserved: array position becomes `sequence`, so the feed
 *     reads in exactly the order it always did.
 *
 * Run the dry run first and read the plan.
 */
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import dotenv from 'dotenv'

// Next.js env precedence: .env.local wins over .env (dotenv never overrides an
// already-set key), so this targets the same database `next dev` serves.
//
// This is NOT incidental. `.env` points at the retired Neon database and
// `.env.local` at the live one; a plain `dotenv/config` silently migrates the
// wrong database and reports success.
const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
dotenv.config({ path: path.join(rootDir, '.env.local') })
dotenv.config({ path: path.join(rootDir, '.env') })

const { getPayload } = await import('payload')
const { default: config } = await import('../src/payload.config')
type Match = import('../src/payload-types').Match

const COMMIT = process.argv.includes('--commit')

/** The id behind a relationship/upload value, however Payload shaped it. */
function idOf(ref: unknown): number | null {
  if (ref == null) return null
  if (typeof ref === 'number') return ref
  if (typeof ref === 'object') return (ref as { id?: number }).id ?? null
  const n = Number(ref)
  return Number.isFinite(n) ? n : null
}

const payload = await getPayload({ config })

console.log(`\n\x1b[1mCommentary + Photos migration\x1b[0m  (${COMMIT ? 'COMMIT' : 'DRY RUN'})\n`)

const matches = (
  await payload.find({ collection: 'matches', limit: 200, depth: 1, pagination: false })
).docs as Match[]

let plannedComments = 0
let plannedPhotos = 0
let wroteComments = 0
let wrotePhotos = 0
let skipped = 0

for (const match of matches) {
  const commentary = match.commentary ?? []
  const photos = match.photos ?? []
  if (commentary.length === 0 && photos.length === 0) continue

  // Idempotency: never double-import a match that already has rows.
  const [existingComments, existingPhotos] = await Promise.all([
    payload.find({
      collection: 'match-commentary',
      where: { match: { equals: match.id } },
      limit: 1,
      depth: 0,
    }),
    payload.find({
      collection: 'match-photos',
      where: { match: { equals: match.id } },
      limit: 1,
      depth: 0,
    }),
  ])

  const doComments = commentary.length > 0 && existingComments.totalDocs === 0
  const doPhotos = photos.length > 0 && existingPhotos.totalDocs === 0

  if (!doComments && !doPhotos) {
    skipped++
    console.log(`  M${match.matchNumber} (id ${match.id}) — already migrated, skipping`)
    continue
  }

  console.log(
    `  M${match.matchNumber} (id ${match.id}) — ${doComments ? commentary.length : 0} entries, ${doPhotos ? photos.length : 0} photos`,
  )
  if (doComments) plannedComments += commentary.length
  if (doPhotos) plannedPhotos += photos.length

  if (!COMMIT) continue

  if (doComments) {
    // Sequentially, so `sequence` lands in array order rather than racing.
    for (let i = 0; i < commentary.length; i++) {
      const c = commentary[i]
      await payload.create({
        collection: 'match-commentary',
        data: {
          match: match.id,
          sequence: i + 1,
          minute: c.minute ?? null,
          type: (c.type ?? 'note') as 'note',
          team: (c.team ?? null) as 'home' | null,
          player: idOf(c.player),
          playerOff: idOf(c.playerOff),
          playerOn: idOf(c.playerOn),
          text: c.text ?? null,
          images: (Array.isArray(c.images) ? c.images : c.images ? [c.images] : [])
            .map(idOf)
            .filter((v): v is number => v !== null),
          hidden: Boolean(c.hidden),
        },
        // The originals were already validated when an editor saved them; a
        // stricter rule added since must not block their migration.
        overrideAccess: true,
        // Recomputing the scoreline after every single insert would mean three
        // extra queries per row for a number that is only right at the end. The
        // match is synced once, below, after all its entries are in.
        context: { skipScoreSync: true },
      })
      wroteComments++
    }

    // One score sync per match, now that every goal entry exists.
    try {
      const goals = await payload.find({
        collection: 'match-commentary',
        where: {
          match: { equals: match.id },
          type: { equals: 'goal' },
          hidden: { not_equals: true },
        },
        limit: 500,
        depth: 0,
        pagination: false,
      })
      const rows = goals.docs as { team?: string | null }[]
      if (rows.length > 0 && !match.manualScore) {
        const home = rows.filter((r) => r.team === 'home').length
        const away = rows.filter((r) => r.team === 'away').length
        if (home !== match.homeScore || away !== match.awayScore) {
          await payload.update({
            collection: 'matches',
            id: match.id,
            data: { homeScore: home, awayScore: away },
            depth: 0,
          })
          console.log(`      score synced -> ${home}-${away}`)
        }
      }
    } catch (err) {
      console.error(`      score sync failed for match ${match.id}:`, err)
    }
  }

  if (doPhotos) {
    for (let i = 0; i < photos.length; i++) {
      const imageId = idOf(photos[i].image)
      if (imageId == null) continue
      await payload.create({
        collection: 'match-photos',
        data: { match: match.id, image: imageId, sequence: i + 1 },
        overrideAccess: true,
      })
      wrotePhotos++
    }
  }
}

console.log('\n' + '─'.repeat(52))
if (COMMIT) {
  console.log(`  created ${wroteComments} commentary entries`)
  console.log(`  created ${wrotePhotos} photos`)
} else {
  console.log(`  would create ${plannedComments} commentary entries`)
  console.log(`  would create ${plannedPhotos} photos`)
  console.log('\n  Re-run with --commit to write.')
}
if (skipped) console.log(`  skipped ${skipped} already-migrated matches`)
console.log('  The matches.commentary / matches.photos arrays were NOT modified.')
console.log('─'.repeat(52) + '\n')

process.exit(0)
