/**
 * One-off importer for the Gor Mahia FC squad from the CECAFA Kagame Cup 2026
 * registration form ("GOR MAHIA FC.docx").
 *
 *   npx tsx scripts/import-gor-mahia-players.ts --dry-run   # validate + report, no writes
 *   npx tsx scripts/import-gor-mahia-players.ts             # import for real
 *   npx tsx scripts/import-gor-mahia-players.ts --clear     # remove players this script imported
 *
 * Follows the existing seed pattern (src/seed/index.ts, scripts/sample-players.ts):
 * Payload local API + the shared payload.config. Idempotent — re-running never
 * duplicates, because each player is matched against existing records by
 * (name + team) before insert.
 *
 * The registration form carries more columns than the Players collection can
 * store — date of birth, nationality, passport no, license no. Per the current
 * schema (src/collections/Players.ts) only name / team / position / shirtNumber
 * are persisted; the rest are parsed, validated and reported, but NOT stored.
 */
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import dotenv from 'dotenv'

// --- Environment ------------------------------------------------------------
// Match Next.js precedence so this script writes to the SAME database the app
// serves: .env.local wins over .env. dotenv never overrides an already-set key,
// so loading .env.local first makes it take priority.
const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
dotenv.config({ path: path.join(rootDir, '.env.local') })
dotenv.config({ path: path.join(rootDir, '.env') })

const { getPayload } = await import('payload')
const { default: config } = await import('../src/payload.config')
const { POSITIONS } = await import('../src/collections/Players')

const DRY_RUN = process.argv.includes('--dry-run')
const CLEAR = process.argv.includes('--clear')
const TEAM_SLUG = 'gor-mahia-fc'
const BATCH_SIZE = 8

type PositionValue = (typeof POSITIONS)[number]['value']
const VALID_POSITIONS = new Set<string>(POSITIONS.map((p) => p.value))

// Coarse positions on the registration form -> the schema's generic slots.
// The form only distinguishes GK / Defender / Midfielder / Forward, so each
// maps to the most neutral matching option in POSITIONS.
const POSITION_MAP: Record<string, PositionValue> = {
  goalkeeper: 'GK',
  gk: 'GK',
  keeper: 'GK',
  defender: 'CB',
  defence: 'CB',
  defense: 'CB',
  midfielder: 'CM',
  midfield: 'CM',
  forward: 'ST',
  striker: 'ST',
  attacker: 'ST',
}

/**
 * Squad exactly as printed in the "PLAYERS LIST" table of GOR MAHIA FC.docx
 * (29 rows; the blank 30th row is omitted). `dob` / `nationality` / `passportNo`
 * / `licenseNo` are kept for validation + reporting only — they have no field in
 * the Players collection and are not written.
 */
interface SourceRow {
  no: number
  fullName: string
  dob: string // dd/mm/yyyy as printed
  nationality: string
  passportNo: string
  licenseNo: string
  position: string
  jerseyNo: string
}

const SOURCE_ROWS: SourceRow[] = [
  { no: 1, fullName: 'Bryne Omondi Odhiambo', dob: '11/01/1997', nationality: 'Kenyan', passportNo: 'BK435588', licenseNo: 'FKF007126', position: 'Goalkeeper', jerseyNo: '23' },
  { no: 2, fullName: 'Kevin Omondi Onyango', dob: '08/08/1997', nationality: 'Kenyan', passportNo: 'BK023055', licenseNo: 'FKF003058', position: 'Goalkeeper', jerseyNo: '35' },
  { no: 3, fullName: 'Humphrey Katasi Simiyu', dob: '24/06/1999', nationality: 'Kenyan', passportNo: 'AK1740990', licenseNo: 'FKF003174', position: 'Goalkeeper', jerseyNo: '27' },
  { no: 4, fullName: 'Michael Onyango', dob: '16/11/1995', nationality: 'Kenyan', passportNo: 'AK1757274', licenseNo: 'FKF000108', position: 'Goalkeeper', jerseyNo: '34' },
  { no: 5, fullName: 'Paul Ochuoga', dob: '13/09/2004', nationality: 'Kenyan', passportNo: 'AK0496607', licenseNo: 'FKF005998', position: 'Defender', jerseyNo: '37' },
  { no: 6, fullName: 'Bryton Otieno Onyona', dob: '05/04/2004', nationality: 'Kenyan', passportNo: 'BK764962', licenseNo: 'FKF057267', position: 'Defender', jerseyNo: '36' },
  { no: 7, fullName: 'Mike Evans Kibwage', dob: '01/10/1997', nationality: 'Kenyan', passportNo: 'AK00113559', licenseNo: 'FKF003164', position: 'Defender', jerseyNo: '4' },
  { no: 8, fullName: 'Sylvester Owino Ahono', dob: '06/05/2001', nationality: 'Kenyan', passportNo: 'BK159634', licenseNo: 'FKF000592', position: 'Defender', jerseyNo: '15' },
  { no: 9, fullName: 'Daniel Sakari Macheso', dob: '25/01/1999', nationality: 'Kenyan', passportNo: 'CK189508', licenseNo: 'FKF002881', position: 'Defender', jerseyNo: '20' },
  { no: 10, fullName: 'Siraji Mohamed Siraji', dob: '04/12/1998', nationality: 'Kenyan', passportNo: 'BK435892', licenseNo: 'FKF003338', position: 'Defender', jerseyNo: '2' },
  { no: 11, fullName: 'Frank Onyango Odhiambo', dob: '29/10/2002', nationality: 'Kenyan', passportNo: 'AK0806916', licenseNo: 'FKF006801', position: 'Defender', jerseyNo: '5' },
  { no: 12, fullName: 'Lewis Bandi Esambe', dob: '01/12/2002', nationality: 'Kenyan', passportNo: 'AK0777694', licenseNo: 'FKF006838', position: 'Defender', jerseyNo: '25' },
  { no: 13, fullName: 'Isaac Deng Kur', dob: '13/06/2006', nationality: 'South Sudanese', passportNo: 'R00516124', licenseNo: 'FKF057778', position: 'Defender', jerseyNo: '18' },
  { no: 14, fullName: 'Enock Momanyi Machaka', dob: '28/04/1998', nationality: 'Kenyan', passportNo: 'AK1508502', licenseNo: 'FKF000893', position: 'Midfielder', jerseyNo: '39' },
  { no: 15, fullName: 'Alpha Chris Onyango ©', dob: '23/12/2000', nationality: 'Kenyan', passportNo: 'AK0080371', licenseNo: 'FKF006843', position: 'Midfielder', jerseyNo: '8' },
  { no: 16, fullName: 'Ben Stanley Omondi', dob: '24/04/2004', nationality: 'Kenyan', passportNo: 'BK129575', licenseNo: 'FKF003225', position: 'Midfielder', jerseyNo: '38' },
  { no: 17, fullName: 'Jackson Dwang Mulla', dob: '26/12/2002', nationality: 'Kenyan', passportNo: 'AK0839602', licenseNo: 'FKF002868', position: 'Midfielder', jerseyNo: '10' },
  { no: 18, fullName: 'Lawrence Ochieng Juma', dob: '17/11/1992', nationality: 'Kenyan', passportNo: 'BK103701', licenseNo: 'FKF006784', position: 'Midfielder', jerseyNo: '24' },
  { no: 19, fullName: 'George Amonoo', dob: '04/04/1999', nationality: 'Ghanaian', passportNo: 'G2888749', licenseNo: 'FKF120339', position: 'Midfielder', jerseyNo: '9' },
  { no: 20, fullName: 'Ebenezer Boadi Adu-kwaw', dob: '03/08/2001', nationality: 'Ghanaian', passportNo: 'G3182964', licenseNo: 'FKF120338', position: 'Midfielder', jerseyNo: '11' },
  { no: 21, fullName: 'Lesley Otieno Owino', dob: '28/08/2002', nationality: 'Kenyan', passportNo: 'AK0091881', licenseNo: 'FKF003119', position: 'Midfielder', jerseyNo: '19' },
  { no: 22, fullName: 'Felix Oluoch', dob: '27/11/1996', nationality: 'Kenyan', passportNo: 'AK1198316', licenseNo: 'FKF006797', position: 'Forward', jerseyNo: '14' },
  { no: 23, fullName: 'Ariste Patrick Ekandjoum Essombe', dob: '05/05/1999', nationality: 'Cameroonian', passportNo: 'AA920927', licenseNo: 'FKF092900', position: 'Forward', jerseyNo: '21' },
  { no: 24, fullName: 'Samuel Kapen', dob: '25/08/2002', nationality: 'Kenyan', passportNo: 'BK304154', licenseNo: 'FKF005177', position: 'Forward', jerseyNo: '22' },
  { no: 25, fullName: 'Sariff Sabuni Sirengo', dob: '09/10/2002', nationality: 'Kenyan', passportNo: 'BK598670', licenseNo: 'FKF006266', position: 'Forward', jerseyNo: '7' },
  { no: 26, fullName: 'Hansel Ochieng Madegwa', dob: '25/10/2001', nationality: 'Kenyan', passportNo: 'BK1053591', licenseNo: 'FKF002866', position: 'Forward', jerseyNo: '17' },
  { no: 27, fullName: 'Paul Okoth Odhiambo', dob: '26/07/2004', nationality: 'Kenyan', passportNo: 'AK0846137', licenseNo: 'FKF010741', position: 'Forward', jerseyNo: '29' },
  { no: 28, fullName: 'David Okoth Odhiambo', dob: '02/03/1993', nationality: 'Kenyan', passportNo: 'BK161104', licenseNo: 'FKF003282', position: 'Forward', jerseyNo: '16' },
  { no: 29, fullName: 'Ebenezer Assifuah', dob: '03/07/1993', nationality: 'Ghanaian', passportNo: 'N00691991', licenseNo: 'FKF136654', position: 'Forward', jerseyNo: '30' },
]

// --- Normalization / validation ---------------------------------------------
const CAPTAIN_MARKER = /\s*(?:©|\(c\)|\(captain\)|\*)\s*$/i

interface Normalized {
  source: SourceRow
  name: string
  position: PositionValue | null
  shirtNumber: number | null
  isCaptain: boolean
  warnings: string[]
}

function normalizeRow(row: SourceRow): Normalized {
  const warnings: string[] = []

  // Name: strip a trailing captain marker, collapse internal whitespace.
  const isCaptain = CAPTAIN_MARKER.test(row.fullName)
  const name = row.fullName.replace(CAPTAIN_MARKER, '').replace(/\s+/g, ' ').trim()
  if (!name) warnings.push('name is empty')

  // Position: map the coarse label to a schema slot.
  const key = row.position.trim().toLowerCase()
  const position = POSITION_MAP[key] ?? (VALID_POSITIONS.has(row.position.trim().toUpperCase()) ? (row.position.trim().toUpperCase() as PositionValue) : null)
  if (!position) warnings.push(`unrecognized position "${row.position}"`)

  // Jersey number: schema allows 1..99; non-blocking (the field is optional).
  let shirtNumber: number | null = null
  const parsed = Number.parseInt(row.jerseyNo.trim(), 10)
  if (!row.jerseyNo.trim()) {
    warnings.push('jersey number missing')
  } else if (Number.isNaN(parsed)) {
    warnings.push(`jersey number "${row.jerseyNo}" is not a number`)
  } else if (parsed < 1 || parsed > 99) {
    warnings.push(`jersey number ${parsed} out of range 1..99 — left blank`)
  } else {
    shirtNumber = parsed
  }

  return { source: row, name, position, shirtNumber, isCaptain, warnings }
}

// --- Run --------------------------------------------------------------------
const payload = await getPayload({ config })
const dbHost = (process.env.NEW_DB_DATABASE_URL || '').replace(/^.*@/, '').replace(/\/.*$/, '') || '(unknown)'

console.log(`\n\x1b[1mGor Mahia FC squad import\x1b[0m`)
console.log(`  target DB : ${dbHost}`)
console.log(`  mode      : ${DRY_RUN ? 'DRY RUN (no writes)' : CLEAR ? 'CLEAR' : 'IMPORT'}\n`)

// Resolve the team.
const teamRes = await payload.find({ collection: 'teams', where: { slug: { equals: TEAM_SLUG } }, limit: 1 })
const team = teamRes.docs[0]
if (!team) {
  console.error(`\x1b[31mTeam "${TEAM_SLUG}" not found — cannot import. Run \`npm run seed\` first.\x1b[0m`)
  process.exit(1)
}
const teamId = team.id
console.log(`  team      : ${team.name} (id=${teamId})\n`)

// --- CLEAR mode: undo a prior import ----------------------------------------
if (CLEAR) {
  const names = SOURCE_ROWS.map((r) => normalizeRow(r).name)
  const existing = await payload.find({
    collection: 'players',
    where: { and: [{ team: { equals: teamId } }, { name: { in: names } }] },
    limit: 200,
  })
  for (const p of existing.docs) {
    await payload.delete({ collection: 'players', id: p.id })
  }
  console.log(`\x1b[33mCleared ${existing.docs.length} Gor Mahia player(s).\x1b[0m\n`)
  process.exit(0)
}

// --- Validate + import ------------------------------------------------------
const normalized = SOURCE_ROWS.map(normalizeRow)

const imported: { name: string; shirt: number | null; position: string }[] = []
const skipped: { name: string; reason: string }[] = []
const failed: { name: string; reason: string }[] = []
const warned: { name: string; warnings: string[] }[] = []

/** Create a single player inside its own transaction so a failure is isolated. */
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

const batches = Math.ceil(normalized.length / BATCH_SIZE)
for (let b = 0; b < batches; b++) {
  const batch = normalized.slice(b * BATCH_SIZE, (b + 1) * BATCH_SIZE)
  console.log(`\x1b[2m— batch ${b + 1}/${batches} (${batch.length} rows) —\x1b[0m`)

  for (const n of batch) {
    const label = `#${n.source.no} ${n.name || '(no name)'}`
    if (n.warnings.length) warned.push({ name: n.name || `#${n.source.no}`, warnings: n.warnings })

    // Hard-invalid → cannot satisfy required fields → record as failure, continue.
    if (!n.name) {
      failed.push({ name: `#${n.source.no}`, reason: 'missing required name' })
      console.log(`  \x1b[31m✗\x1b[0m ${label} — missing name`)
      continue
    }
    if (!n.position) {
      failed.push({ name: n.name, reason: `unmappable position "${n.source.position}"` })
      console.log(`  \x1b[31m✗\x1b[0m ${label} — unmappable position`)
      continue
    }

    // Duplicate check: (name + team). Skip if already present.
    const dupe = await payload.find({
      collection: 'players',
      where: { and: [{ team: { equals: teamId } }, { name: { equals: n.name } }] },
      limit: 1,
    })
    if (dupe.docs.length > 0) {
      skipped.push({ name: n.name, reason: `already exists (id=${dupe.docs[0].id})` })
      console.log(`  \x1b[33m⊘\x1b[0m ${label} — duplicate, skipped`)
      continue
    }

    const data = {
      name: n.name,
      team: teamId,
      position: n.position,
      ...(n.shirtNumber != null ? { shirtNumber: n.shirtNumber } : {}),
    }

    if (DRY_RUN) {
      imported.push({ name: n.name, shirt: n.shirtNumber, position: n.position })
      console.log(`  \x1b[36m·\x1b[0m ${label} — would import (${n.position}${n.shirtNumber != null ? `, #${n.shirtNumber}` : ''})${n.isCaptain ? ' [captain]' : ''}`)
      continue
    }

    try {
      const doc = await createPlayer(data)
      imported.push({ name: n.name, shirt: n.shirtNumber, position: n.position })
      console.log(`  \x1b[32m✓\x1b[0m ${label} — imported (id=${doc.id}, ${n.position}${n.shirtNumber != null ? `, #${n.shirtNumber}` : ''})${n.isCaptain ? ' [captain]' : ''}`)
    } catch (err) {
      const reason = err instanceof Error ? err.message : String(err)
      failed.push({ name: n.name, reason })
      console.log(`  \x1b[31m✗\x1b[0m ${label} — FAILED: ${reason}`)
    }
  }
}

// --- Summary ----------------------------------------------------------------
const DROPPED_FIELDS = ['date of birth', 'nationality', 'passport no', 'license no']

console.log(`\n\x1b[1m${'═'.repeat(52)}\x1b[0m`)
console.log(`\x1b[1m  IMPORT SUMMARY — Gor Mahia FC${DRY_RUN ? ' (dry run)' : ''}\x1b[0m`)
console.log(`\x1b[1m${'═'.repeat(52)}\x1b[0m`)
console.log(`  Total players found in document : ${SOURCE_ROWS.length}`)
console.log(`  ${DRY_RUN ? 'Would import' : 'Successfully imported'}          : \x1b[32m${imported.length}\x1b[0m`)
console.log(`  Skipped (duplicates)            : \x1b[33m${skipped.length}\x1b[0m`)
console.log(`  Failed                          : \x1b[31m${failed.length}\x1b[0m`)
console.log(`  Rows with data warnings         : ${warned.length}`)

if (skipped.length) {
  console.log(`\n  \x1b[33mSkipped:\x1b[0m`)
  skipped.forEach((s) => console.log(`    • ${s.name} — ${s.reason}`))
}
if (failed.length) {
  console.log(`\n  \x1b[31mFailed:\x1b[0m`)
  failed.forEach((f) => console.log(`    • ${f.name} — ${f.reason}`))
}
if (warned.length) {
  console.log(`\n  \x1b[2mData warnings (non-blocking):\x1b[0m`)
  warned.forEach((w) => console.log(`    • ${w.name} — ${w.warnings.join('; ')}`))
}

console.log(`\n  \x1b[2mFields present in the document but NOT stored (no schema field):\x1b[0m`)
console.log(`    ${DROPPED_FIELDS.join(', ')}`)
console.log(`\x1b[1m${'═'.repeat(52)}\x1b[0m\n`)

process.exit(0)
