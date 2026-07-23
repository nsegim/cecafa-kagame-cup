/** Extracts a YouTube video ID from watch/share/embed URL formats. */
export function youtubeEmbedUrl(url: string): string | null {
  const patterns = [
    /youtu\.be\/([\w-]{11})/,
    /youtube\.com\/watch\?v=([\w-]{11})/,
    /youtube\.com\/embed\/([\w-]{11})/,
    /youtube\.com\/shorts\/([\w-]{11})/,
  ]
  for (const re of patterns) {
    const match = url.match(re)
    if (match) return `https://www.youtube.com/embed/${match[1]}?autoplay=1`
  }
  return null
}
