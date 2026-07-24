/**
 * Bulk squad importer for the remaining CECAFA Kagame Cup 2026 registration
 * forms (every club except Gor Mahia, which has its own script).
 *
 *   npx tsx scripts/import-squads.ts --dry-run          # validate + report, no writes
 *   npx tsx scripts/import-squads.ts                    # import all teams
 *   npx tsx scripts/import-squads.ts --team=vipers-sc   # one team only
 *   npx tsx scripts/import-squads.ts --clear            # remove players this importer added
 *
 * Data source: scripts/data/cecafa-squads.json — parsed from the .docx forms
 * (APR was a scanned image, transcribed by hand). See that file's provenance in
 * each team's `source` field.
 *
 * Same contract as scripts/import-gor-mahia-players.ts and the seed scripts:
 * Payload local API + shared payload.config, .env.local precedence so writes go
 * to the DB the app actually serves. Idempotent (dedupe on name+team), each
 * insert isolated in its own transaction, per-record failures never stop the run.
 *
 * The forms carry DOB / nationality / passport no / license no, which the
 * `players` collection cannot store — those are parsed and reported, not saved.
 */
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import dotenv from 'dotenv'

// Next.js env precedence: .env.local wins over .env (dotenv never overrides an
// already-set key), so this targets the same database `next dev` serves.
const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
dotenv.config({ path: path.join(rootDir, '.env.local') })
dotenv.config({ path: path.join(rootDir, '.env') })

const { getPayload } = await import('payload')
const { default: config } = await import('../src/payload.config')
const { POSITIONS } = await import('../src/collections/Players')

const DRY_RUN = process.argv.includes('--dry-run')
const CLEAR = process.argv.includes('--clear')
const teamFilter = process.argv.find((a) => a.startsWith('--team='))?.split('=')[1]
const BATCH_SIZE = 10
const PLACEHOLDER_POSITION = 'CM' as const

type PositionValue = (typeof POSITIONS)[number]['value']
const VALID_POSITIONS = new Set<string>(POSITIONS.map((p) => p.value))

// Every position label seen across the 10 forms (English, French, common
// abbreviations and misspellings), keyed by its letters-only lowercase form.
// The forms only distinguish coarse roles, so each maps to the most neutral
// matching slot in POSITIONS.
const POSITION_MAP: Record<string, PositionValue> = {
  // goalkeeper
  goalkeeper: 'GK', gk: 'GK', gardien: 'GK', keeper: 'GK',
  // defenders (generic + centre-back variants)
  defender: 'CB', defenseur: 'CB', df: 'CB', defence: 'CB', defense: 'CB',
  centerback: 'CB', centreback: 'CB', centraldefender: 'CB', fullback: 'CB',
  leftback: 'LB', rightback: 'RB', wingback: 'RB',
  // midfielders
  midfielder: 'CM', midfeilder: 'CM', midfield: 'CM', mf: 'CM', milieu: 'CM',
  centralmidfielder: 'CM', centralmidfieder: 'CM',
  amedfield: 'CAM', attackingmidfielder: 'CAM',
  dmedfield: 'CDM', defensivemidfielder: 'CDM', defensivemidfieder: 'CDM',
  // wide
  leftwinger: 'LW', rightwinger: 'RW', winger: 'RW',
  // attackers
  forward: 'ST', striker: 'ST', stricker: 'ST', fw: 'ST', attaquant: 'ST', attacker: 'ST',
}

function mapPosition(raw: string): PositionValue | null {
  const key = raw.toLowerCase().replace(/[^a-z]/g, '')
  if (POSITION_MAP[key]) return POSITION_MAP[key]
  const upper = raw.trim().toUpperCase()
  return VALID_POSITIONS.has(upper) ? (upper as PositionValue) : null
}

// --- Data -------------------------------------------------------------------
interface RawPlayer {
  no: string
  name: string
  dob: string
  nationality: string
  passportNo: string
  licenseNo: string
  position: string
  jerseyNo: string
}
interface TeamGroup {
  teamSlug: string
  source: string
  positionPlaceholder: boolean
  players: RawPlayer[]
}

const squads: TeamGroup[] = JSON.parse(
  readFileSync(path.join(rootDir, 'scripts/data/cecafa-squads.json'), 'utf8'),
)
const groups = teamFilter ? squads.filter((g) => g.teamSlug === teamFilter) : squads
if (teamFilter && groups.length === 0) {
  console.error(`No team "${teamFilter}" in the data file.`)
  process.exit(1)
}

// --- Normalization ----------------------------------------------------------
const CAPTAIN_MARKER = /\s*(?:©|\(c\)|\(captain\)|\*)\s*$/i

interface Normalized {
  raw: RawPlayer
  name: string
  position: PositionValue | null
  shirtNumber: number | null
  isCaptain: boolean
  placeholderPosition: boolean
  warnings: string[]
  fatal: string | null
}

function normalize(raw: RawPlayer, placeholderAllowed: boolean): Normalized {
  const warnings: string[] = []
  let fatal: string | null = null

  const isCaptain = CAPTAIN_MARKER.test(raw.name)
  const name = raw.name.replace(CAPTAIN_MARKER, '').replace(/\s+/g, ' ').trim()
  if (!name) fatal = 'missing required name'

  let position = mapPosition(raw.position)
  let placeholderPosition = false
  if (!position) {
    if (placeholderAllowed) {
      position = PLACEHOLDER_POSITION
      placeholderPosition = true
      warnings.push(`no position in source — placeholder "${PLACEHOLDER_POSITION}" set, correct manually`)
    } else if (!fatal) {
      fatal = raw.position.trim()
        ? `unmappable position "${raw.position}"`
        : 'missing required position'
    }
  }

  let shirtNumber: number | null = null
  const jersey = raw.jerseyNo.trim()
  const parsed = Number.parseInt(jersey, 10)
  if (!jersey) {
    warnings.push('jersey number missing')
  } else if (Number.isNaN(parsed)) {
    warnings.push(`jersey "${jersey}" not numeric — left blank`)
  } else if (parsed < 1 || parsed > 99) {
    warnings.push(`jersey ${parsed} out of range 1..99 — left blank`)
  } else {
    shirtNumber = parsed
  }

  return { raw, name, position, shirtNumber, isCaptain, placeholderPosition, warnings, fatal }
}

// --- Run --------------------------------------------------------------------
const payload = await getPayload({ config })
const dbHost = (process.env.NEW_DB_DATABASE_URL || '').replace(/^.*@/, '').replace(/\/.*$/, '') || '(unknown)'

console.log(`\n\x1b[1mCECAFA squad import\x1b[0m`)
console.log(`  target DB : ${dbHost}`)
console.log(`  mode      : ${DRY_RUN ? 'DRY RUN (no writes)' : CLEAR ? 'CLEAR' : 'IMPORT'}`)
console.log(`  teams     : ${groups.map((g) => g.teamSlug).join(', ')}\n`)

async function createPlayer(data: { name: string; team: number; position: PositionValue; shirtNumber?: number }) {
  const transactionID = (await payload.db.beginTransaction?.()) ?? undefined
  try {
    const req = transactionID ? ({ transactionID } as never) : undefined
    const doc = await payload.create({ collection: 'players', data, req })
    if (transactionID) await payload.db.commitTransaction?.(transactionID)
    return doc
  } catch (err) {
    if (transactionID) await payload.db.rollbackTransaction?.(transactionID)
    throw err
  }
}

interface TeamResult {
  slug: string
  found: number
  imported: string[]
  skipped: { name: string; reason: string }[]
  failed: { name: string; reason: string }[]
  warned: { name: string; warnings: string[] }[]
  placeholders: string[]
  teamMissing: boolean
}

const results: TeamResult[] = []

for (const group of groups) {
  const res: TeamResult = {
    slug: group.teamSlug,
    found: group.players.length,
    imported: [],
    skipped: [],
    failed: [],
    warned: [],
    placeholders: [],
    teamMissing: false,
  }
  results.push(res)

  const teamRes = await payload.find({ collection: 'teams', where: { slug: { equals: group.teamSlug } }, limit: 1 })
  const team = teamRes.docs[0]
  console.log(`\x1b[1m▸ ${group.teamSlug}\x1b[0m — ${team ? team.name : '\x1b[31mTEAM NOT FOUND\x1b[0m'} (${group.players.length} in doc)`)
  if (!team) {
    res.teamMissing = true
    group.players.forEach((p) => res.failed.push({ name: p.name, reason: 'team not found in DB' }))
    console.log(`  \x1b[31mskipping whole team — run \`npm run seed\` first\x1b[0m\n`)
    continue
  }
  const teamId = team.id

  if (CLEAR) {
    const names = group.players.map((p) => normalize(p, group.positionPlaceholder).name).filter(Boolean)
    const existing = await payload.find({
      collection: 'players',
      where: { and: [{ team: { equals: teamId } }, { name: { in: names } }] },
      limit: 300,
    })
    for (const p of existing.docs) await payload.delete({ collection: 'players', id: p.id })
    console.log(`  \x1b[33mcleared ${existing.docs.length}\x1b[0m\n`)
    res.imported = [] // reuse struct; report via skipped count below
    res.skipped = existing.docs.map((d) => ({ name: String(d.name), reason: 'deleted' }))
    continue
  }

  // Dedupe against existing records with ONE query per team (not one per
  // player). Names inserted during this run are added to the set too, so a
  // duplicate name within the same document is also caught.
  const existing = await payload.find({
    collection: 'players',
    where: { team: { equals: teamId } },
    limit: 500,
    depth: 0,
  })
  const seen = new Map<string, number | string>()
  for (const d of existing.docs) seen.set(String(d.name).toLowerCase(), d.id)

  const normalized = group.players.map((p) => normalize(p, group.positionPlaceholder))
  const batches = Math.ceil(normalized.length / BATCH_SIZE)

  for (let b = 0; b < batches; b++) {
    const batch = normalized.slice(b * BATCH_SIZE, (b + 1) * BATCH_SIZE)
    for (const n of batch) {
      if (n.warnings.length) res.warned.push({ name: n.name || `#${n.raw.no}`, warnings: n.warnings })
      if (n.placeholderPosition) res.placeholders.push(n.name)

      if (n.fatal) {
        res.failed.push({ name: n.name || `#${n.raw.no}`, reason: n.fatal })
        console.log(`  \x1b[31m✗\x1b[0m ${n.name || `#${n.raw.no}`} — ${n.fatal}`)
        continue
      }

      const key = n.name.toLowerCase()
      if (seen.has(key)) {
        res.skipped.push({ name: n.name, reason: `already exists (id=${seen.get(key)})` })
        console.log(`  \x1b[33m⊘\x1b[0m ${n.name} — duplicate, skipped`)
        continue
      }

      const data = {
        name: n.name,
        team: teamId,
        position: n.position!,
        ...(n.shirtNumber != null ? { shirtNumber: n.shirtNumber } : {}),
      }
      const tag = `${n.position}${n.shirtNumber != null ? `, #${n.shirtNumber}` : ''}${n.placeholderPosition ? ' [placeholder pos]' : ''}${n.isCaptain ? ' [captain]' : ''}`

      if (DRY_RUN) {
        seen.set(key, 'pending')
        res.imported.push(n.name)
        console.log(`  \x1b[36m·\x1b[0m ${n.name} — would import (${tag})`)
        continue
      }
      try {
        const doc = await createPlayer(data)
        seen.set(key, doc.id)
        res.imported.push(n.name)
        console.log(`  \x1b[32m✓\x1b[0m ${n.name} — imported (id=${doc.id}, ${tag})`)
      } catch (err) {
        const reason = err instanceof Error ? err.message : String(err)
        res.failed.push({ name: n.name, reason })
        console.log(`  \x1b[31m✗\x1b[0m ${n.name} — FAILED: ${reason}`)
      }
    }
  }
  console.log('')
}

// --- Summary ----------------------------------------------------------------
if (CLEAR) {
  const total = results.reduce((s, r) => s + r.skipped.length, 0)
  console.log(`\x1b[33mCleared ${total} player(s) across ${results.length} team(s).\x1b[0m`)
  process.exit(0)
}

const totals = results.reduce(
  (s, r) => ({
    found: s.found + r.found,
    imported: s.imported + r.imported.length,
    skipped: s.skipped + r.skipped.length,
    failed: s.failed + r.failed.length,
    placeholders: s.placeholders + r.placeholders.length,
  }),
  { found: 0, imported: 0, skipped: 0, failed: 0, placeholders: 0 },
)

const line = '═'.repeat(72)
console.log(`\n\x1b[1m${line}\x1b[0m`)
console.log(`\x1b[1m  IMPORT SUMMARY${DRY_RUN ? ' (dry run)' : ''}\x1b[0m`)
console.log(`\x1b[1m${line}\x1b[0m`)
console.log(`  ${'Team'.padEnd(26)} ${'found'.padStart(6)} ${(DRY_RUN ? 'would' : 'import').padStart(7)} ${'skip'.padStart(5)} ${'fail'.padStart(5)}`)
for (const r of results) {
  console.log(
    `  ${r.slug.padEnd(26)} ${String(r.found).padStart(6)} ${String(r.imported.length).padStart(7)} ${String(r.skipped.length).padStart(5)} ${String(r.failed.length).padStart(5)}`,
  )
}
console.log(`  ${'-'.repeat(52)}`)
console.log(
  `  ${'TOTAL'.padEnd(26)} ${String(totals.found).padStart(6)} ${String(totals.imported).padStart(7)} ${String(totals.skipped).padStart(5)} ${String(totals.failed).padStart(5)}`,
)

const failedAll = results.flatMap((r) => r.failed.map((f) => ({ slug: r.slug, ...f })))
if (failedAll.length) {
  console.log(`\n  \x1b[31mFailed (${failedAll.length}):\x1b[0m`)
  failedAll.forEach((f) => console.log(`    • [${f.slug}] ${f.name} — ${f.reason}`))
}

if (totals.placeholders) {
  console.log(`\n  \x1b[33mPlaceholder positions (${totals.placeholders}) — set manually in /admin:\x1b[0m`)
  for (const r of results) {
    if (r.placeholders.length) console.log(`    • ${r.slug}: ${r.placeholders.length} players (all "${PLACEHOLDER_POSITION}")`)
  }
}

const warnedAll = results.flatMap((r) => r.warned)
if (warnedAll.length) {
  const jerseyOnly = warnedAll.filter((w) => w.warnings.every((x) => x.includes('jersey'))).length
  console.log(`\n  \x1b[2mData warnings: ${warnedAll.length} players (e.g. ${jerseyOnly} jersey-number issues). Non-blocking.\x1b[0m`)
}

console.log(`\n  \x1b[2mParsed from the forms but NOT stored (no schema field): date of birth, nationality, passport no, license no\x1b[0m`)
console.log(`\x1b[1m${line}\x1b[0m\n`)

process.exit(0)
