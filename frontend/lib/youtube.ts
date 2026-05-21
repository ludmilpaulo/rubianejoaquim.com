export function getYoutubeEmbedUrl(url: string): string {
  if (!url) return ''
  if (url.includes('/embed/')) return url
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
  ]
  for (const pattern of patterns) {
    const match = url.match(pattern)
    if (match?.[1]) return `https://www.youtube.com/embed/${match[1]}`
  }
  return url
}
