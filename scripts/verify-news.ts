/**
 * Hits IGIHE's live WordPress API and prints what the news cards would render.
 *
 *   npx tsx scripts/verify-news.ts
 */
import { fetchLatestNews } from '../src/lib/news'

const articles = await fetchLatestNews({ limit: 5 })

if (articles.length === 0) {
  console.error('\n\x1b[31mNo articles returned — check connectivity or the category ID.\x1b[0m\n')
  process.exit(1)
}

console.log(`\n\x1b[1mFetched ${articles.length} articles from IGIHE\x1b[0m\n`)

for (const a of articles) {
  console.log(`\x1b[1m${a.title}\x1b[0m`)
  console.log(`  ${a.excerpt.slice(0, 110)}${a.excerpt.length > 110 ? '…' : ''}`)
  console.log(
    `  \x1b[2m${new Date(a.publishedAt).toDateString()} · ${a.readingMinutes} min read\x1b[0m`,
  )
  console.log(`  \x1b[2mimage: ${a.imageUrl ? a.imageUrl.slice(0, 72) : 'MISSING'}\x1b[0m`)
  console.log()
}

const problems: string[] = []
if (articles.some((a) => !a.title)) problems.push('an article has no title')
if (articles.some((a) => !a.url)) problems.push('an article has no link')
if (articles.some((a) => /&[a-z]+;|&#\d+;/i.test(a.title)))
  problems.push('HTML entities survived decoding in a title')
if (articles.some((a) => /<[a-z]/i.test(a.title + a.excerpt)))
  problems.push('raw HTML tags survived stripping')

const missingImages = articles.filter((a) => !a.imageUrl).length
if (missingImages) console.log(`\x1b[33mNote: ${missingImages}/${articles.length} lack an image — cards need a fallback.\x1b[0m`)

if (problems.length) {
  console.log(`\x1b[31mProblems:\x1b[0m\n${problems.map((p) => `  - ${p}`).join('\n')}\n`)
  process.exit(1)
}

console.log('\x1b[32m\x1b[1mNews feed OK — titles decoded, HTML stripped, links present.\x1b[0m\n')
