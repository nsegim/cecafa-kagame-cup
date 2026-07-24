/**
 * Server-side data layer for the homepage Highlights carousel.
 */
import { getPayloadClient } from '@/lib/payload'
import type { Video } from '@/payload-types'

/** Every visible video, newest-added first. Empty until an editor adds one. */
export async function getVideos(): Promise<Video[]> {
  try {
    const payload = await getPayloadClient()
    const res = await payload.find({
      collection: 'videos',
      where: { visible: { not_equals: false } },
      sort: '-createdAt',
      limit: 25,
      depth: 1,
    })
    return res.docs as Video[]
  } catch (err) {
    console.error('[videos] failed to read videos:', err)
    return []
  }
}
