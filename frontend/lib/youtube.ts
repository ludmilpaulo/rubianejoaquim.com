export function getYoutubeVideoId(url: string): string | null {
  if (!url) return null
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
  ]
  for (const pattern of patterns) {
    const match = url.match(pattern)
    if (match?.[1]) return match[1]
  }
  return null
}

export function getYoutubeThumbnail(url: string): string {
  const id = getYoutubeVideoId(url)
  return id ? `https://img.youtube.com/vi/${id}/maxresdefault.jpg` : ''
}

export function getYoutubeEmbedUrl(url: string): string {
  if (!url) return ''
  if (url.includes('/embed/')) return url
  const id = getYoutubeVideoId(url)
  if (id) return `https://www.youtube.com/embed/${id}`
  return url
}
