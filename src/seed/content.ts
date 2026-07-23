/**
 * Seeds editorial content: the gallery (migrated from the previously hardcoded
 * design assets) and a handful of sample external news articles.
 *
 * Idempotent — keyed by filename / title / slug, so re-running updates rather
 * than duplicating. Media is uploaded from /public/design; with Cloudinary
 * credentials set it lands in Cloudinary, otherwise on local disk.
 */
import path from 'path'
import type { Payload } from 'payload'

const DESIGN_DIR = path.resolve(process.cwd(), 'public/design')

interface GallerySeed {
  key: string
  file: string
  alt: string
  category: 'Action' | 'Match Day' | 'Trophy' | 'Fans' | 'Stadium' | 'APR FC'
}

const GALLERY_SEED: GallerySeed[] = [
  { key: 'match-day-stadium', file: 'gallery-stadium.jpg', alt: 'Football teams lined up on the pitch before a match', category: 'Match Day' },
  { key: 'match-ball', file: 'gallery-ball.jpg', alt: 'CECAFA match ball on the grass', category: 'Action' },
  { key: 'trophy-celebration', file: 'gallery-trophy-held.jpg', alt: 'A player lifting the CECAFA trophy', category: 'Trophy' },
  { key: 'goalkeeper-kick', file: 'gallery-goalkeeper.jpg', alt: 'Goalkeeper clearing the ball during a match', category: 'Action' },
  { key: 'apr-forward', file: 'gallery-apr-forward.jpg', alt: 'APR FC forward carrying the ball', category: 'APR FC' },
  { key: 'trophy', file: 'gallery-trophy.jpg', alt: 'The CECAFA trophy displayed on the pitch', category: 'Trophy' },
  { key: 'stadium-pitch', file: 'gallery-pitch.jpg', alt: 'Aerial view of the stadium pitch', category: 'Stadium' },
  { key: 'supporters', file: 'gallery-fans.jpg', alt: 'Supporters watching from the stadium stands', category: 'Fans' },
  { key: 'match-action', file: 'gallery-action.jpg', alt: 'A player in orange controlling the ball', category: 'Action' },
]

/** The approved home mosaic order (trophy intentionally repeats three times). */
const HOME_TILE_ORDER = [
  'match-day-stadium',
  'match-ball',
  'trophy-celebration',
  'goalkeeper-kick',
  'apr-forward',
  'trophy',
  'trophy',
  'trophy',
  'stadium-pitch',
]

interface ArticleSeed {
  slug: string
  title: string
  file: string
  alt: string
  shortDescription: string
  externalUrl: string
  category: string
  featured?: boolean
  displayOrder: number
}

const ARTICLE_SEED: ArticleSeed[] = [
  {
    slug: 'apr-open-against-gor-mahia',
    title: 'APR open at home against Gor Mahia',
    file: 'news-stadium.jpg',
    alt: 'Floodlit stadium before kick-off',
    shortDescription:
      'Three-time champions APR FC begin their Kagame Cup campaign against Kenya’s Gor Mahia on 24 July in a demanding Group A.',
    externalUrl: 'https://old.igihe.com/imikino/football/',
    category: 'Preview',
    featured: true,
    displayOrder: 0,
  },
  {
    slug: 'simba-eye-another-crown',
    title: 'Simba SC eye another CECAFA crown',
    file: 'news-floodlights.jpg',
    alt: 'Stadium floodlights at night',
    shortDescription:
      'Tanzanian giants Simba arrive in Kigali among the favourites, chasing a record-extending regional title.',
    externalUrl: 'https://old.igihe.com/imikino/football/',
    category: 'Analysis',
    displayOrder: 1,
  },
  {
    slug: 'rayon-sports-home-hopes',
    title: 'Rayon Sports carry home hopes in Group C',
    file: 'news-crowd.jpg',
    alt: 'Supporters filling the stands',
    shortDescription:
      'Blue-and-white faithful expect a deep run as Rayon Sports open against Zanzibar’s KVZ.',
    externalUrl: 'https://old.igihe.com/imikino/football/',
    category: 'News',
    displayOrder: 2,
  },
  {
    slug: 'kigali-ready-to-host',
    title: 'Kigali ready to host the region’s best',
    file: 'news-night-stadium.jpg',
    alt: 'Modern stadium lit up at night',
    shortDescription:
      'Amahoro and Kigali Pele stadiums have been readied for fifteen days of East and Central African football.',
    externalUrl: 'https://old.igihe.com/imikino/football/',
    category: 'Feature',
    displayOrder: 3,
  },
  {
    slug: 'group-b-wide-open',
    title: 'Group B looks the most unpredictable',
    file: 'news-field.jpg',
    alt: 'Green pitch under stadium lights',
    shortDescription:
      'With Simba, Mogadishu City, Singida Black Stars and Jamus, the middle group could go any way.',
    externalUrl: 'https://old.igihe.com/imikino/football/',
    category: 'Analysis',
    displayOrder: 4,
  },
]

async function upsertMedia(payload: Payload, file: string, alt: string): Promise<number> {
  const existing = await payload.find({
    collection: 'media',
    where: { filename: { equals: file } },
    limit: 1,
  })
  if (existing.docs.length > 0) {
    const doc = await payload.update({
      collection: 'media',
      id: existing.docs[0].id,
      data: { alt },
    })
    return doc.id
  }
  const created = await payload.create({
    collection: 'media',
    filePath: path.join(DESIGN_DIR, file),
    data: { alt },
  })
  return created.id
}

async function upsertGalleryImage(
  payload: Payload,
  seed: GallerySeed,
  imageId: number,
  order: number,
): Promise<number> {
  const existing = await payload.find({
    collection: 'gallery-images',
    where: { title: { equals: seed.key } },
    limit: 1,
  })
  const data = { title: seed.key, image: imageId, category: seed.category, order }
  if (existing.docs.length > 0) {
    const doc = await payload.update({ collection: 'gallery-images', id: existing.docs[0].id, data })
    return doc.id
  }
  const created = await payload.create({ collection: 'gallery-images', data })
  return created.id
}

async function upsertArticle(payload: Payload, seed: ArticleSeed, imageId: number): Promise<void> {
  const data = {
    slug: seed.slug,
    title: seed.title,
    featuredImage: imageId,
    shortDescription: seed.shortDescription,
    externalUrl: seed.externalUrl,
    category: seed.category,
    featured: seed.featured ?? false,
    displayOrder: seed.displayOrder,
    visibility: 'visible' as const,
  }
  const existing = await payload.find({
    collection: 'articles',
    where: { slug: { equals: seed.slug } },
    limit: 1,
  })
  if (existing.docs.length > 0) {
    await payload.update({ collection: 'articles', id: existing.docs[0].id, data })
  } else {
    await payload.create({ collection: 'articles', data })
  }
}

export async function seedContent(payload: Payload): Promise<void> {
  // --- Gallery images -------------------------------------------------------
  const galleryIdByKey = new Map<string, number>()
  for (let i = 0; i < GALLERY_SEED.length; i++) {
    const seed = GALLERY_SEED[i]
    const mediaId = await upsertMedia(payload, seed.file, seed.alt)
    const galleryId = await upsertGalleryImage(payload, seed, mediaId, i)
    galleryIdByKey.set(seed.key, galleryId)
  }
  console.log(`  gallery: ${galleryIdByKey.size} photos`)

  // --- Gallery global (hero + home mosaic) ----------------------------------
  const heroId = await upsertMedia(payload, 'gallery-hero.jpg', 'CECAFA Kagame Cup gallery')
  const homeTiles = HOME_TILE_ORDER.map((key) => galleryIdByKey.get(key))
    .filter((id): id is number => typeof id === 'number')
    .map((image) => ({ image }))
  await payload.updateGlobal({ slug: 'gallery', data: { heroImage: heroId, homeTiles } })
  console.log(`  gallery global: hero + ${homeTiles.length} mosaic tiles`)

  // --- Articles -------------------------------------------------------------
  for (const seed of ARTICLE_SEED) {
    const mediaId = await upsertMedia(payload, seed.file, seed.alt)
    await upsertArticle(payload, seed, mediaId)
  }
  console.log(`  articles: ${ARTICLE_SEED.length} external links`)
}
