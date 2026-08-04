/**
 * One-time backfill for the `roles` field added to Users.
 *
 * `defaultValue` on a Payload field only applies to documents created AFTER
 * the field exists — it does not retroactively fill rows already in Postgres.
 * Every user who could already log in before this field existed is granted
 * super_admin here, so nobody loses access. Idempotent — safe to re-run.
 *
 *   npx tsx src/scripts/backfill-user-roles.ts
 */
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import dotenv from 'dotenv'

// Match Next.js precedence so this script writes to the SAME database the app
// serves: .env.local wins over .env. dotenv never overrides an already-set key,
// so loading .env.local first makes it take priority. See scripts/import-gor-mahia-players.ts.
const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..')
dotenv.config({ path: path.join(rootDir, '.env.local') })
dotenv.config({ path: path.join(rootDir, '.env') })

const { getPayload } = await import('payload')
const { default: config } = await import('../payload.config')

const payload = await getPayload({ config })
console.log(`Target DB: ${(process.env.NEW_DB_DATABASE_URL || '').replace(/:[^:@]+@/, ':***@')}`)

const users = await payload.find({
  collection: 'users',
  where: { roles: { exists: false } },
  limit: 0,
  depth: 0,
})

if (users.docs.length === 0) {
  console.log('No users need a roles backfill — all users already have roles set.')
} else {
  for (const user of users.docs) {
    await payload.update({
      collection: 'users',
      id: user.id,
      data: { roles: ['super_admin'] },
    })
    console.log(`  ${user.email}: roles -> ['super_admin']`)
  }
  console.log(`\nBackfilled ${users.docs.length} user(s) to super_admin.`)
}

process.exit(0)
