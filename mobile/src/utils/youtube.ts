/**
 * Utility functions for YouTube video handling
 */

/**
 * Extract YouTube video ID from various URL formats
 * Supports:
 * - https://www.youtube.com/watch?v=VIDEO_ID
 * - https://youtu.be/VIDEO_ID
 * - https://www.youtube.com/embed/VIDEO_ID
 * - https://m.youtube.com/watch?v=VIDEO_ID
 */
export function extractYouTubeVideoId(url: string): string | null {
  if (!url) return null

  // Remove any query parameters and fragments
  const cleanUrl = url.split('?')[0].split('#')[0]

  // Pattern 1: youtube.com/watch?v=VIDEO_ID
  const watchMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/)
  if (watchMatch && watchMatch[1]) {
    return watchMatch[1]
  }

  // Pattern 2: youtube.com/v/VIDEO_ID
  const vMatch = url.match(/youtube\.com\/v\/([^&\n?#]+)/)
  if (vMatch && vMatch[1]) {
    return vMatch[1]
  }

  // Pattern 3: youtube.com/embed/VIDEO_ID
  const embedMatch = url.match(/youtube\.com\/embed\/([^&\n?#]+)/)
  if (embedMatch && embedMatch[1]) {
    return embedMatch[1]
  }

  // Pattern 4: youtu.be/VIDEO_ID
  const shortMatch = url.match(/youtu\.be\/([^&\n?#]+)/)
  if (shortMatch && shortMatch[1]) {
    return shortMatch[1]
  }

  return null
}

/**
 * Check if a URL is a YouTube URL
 */
export function isYouTubeUrl(url: string): boolean {
  if (!url) return false
  return /youtube\.com|youtu\.be/.test(url)
}

/**
 * Get YouTube embed URL from video ID
 */
export function getYouTubeEmbedUrl(videoId: string): string {
  return `https://www.youtube.com/embed/${videoId}`
}
