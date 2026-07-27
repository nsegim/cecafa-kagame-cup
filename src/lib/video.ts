/** Extracts a YouTube video ID from watch/share/embed/shorts URL formats. */
export function youtubeVideoId(url: string): string | null {
  const patterns = [
    /youtu\.be\/([\w-]{11})/,
    /youtube\.com\/watch\?v=([\w-]{11})/,
    /youtube\.com\/embed\/([\w-]{11})/,
    /youtube\.com\/shorts\/([\w-]{11})/,
  ]
  for (const re of patterns) {
    const match = url.match(re)
    if (match) return match[1]
  }
  return null
}

/**
 * The player URL for a YouTube link, or `null` if it isn't one.
 *
 * `autoplay` is right for a lightbox the visitor just clicked open, and wrong
 * for a player sitting inline in a page — several commentary entries can each
 * carry one, and they must not all start playing on their own.
 */
export function youtubeEmbedUrl(url: string, { autoplay = false } = {}): string | null {
  const id = youtubeVideoId(url)
  if (!id) return null
  return `https://www.youtube.com/embed/${id}${autoplay ? '?autoplay=1' : ''}`
}

/**
 * Every YouTube link in a run of text, in order and without repeats.
 *
 * Editors paste links straight into the commentary text — the rich-text editor
 * has no auto-linking, so a pasted URL stays plain text — hence matching on the
 * raw string rather than only on link nodes.
 */
export function findYouTubeUrls(text: string): string[] {
  const urls = text.match(/https?:\/\/[^\s<>"']+/g) ?? []
  const seen = new Set<string>()
  const found: string[] = []
  for (const url of urls) {
    // Trailing punctuation from surrounding prose ("...watch it: <url>.") is
    // not part of the link.
    const id = youtubeVideoId(url.replace(/[.,;:!?)\]]+$/, ''))
    if (id && !seen.has(id)) {
      seen.add(id)
      found.push(`https://www.youtube.com/embed/${id}`)
    }
  }
  return found
}
