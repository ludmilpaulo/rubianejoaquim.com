/** Allow only same-origin relative paths used after login (family invite, copilot). */
export function safeAuthNext(raw: string | null | undefined): string | null {
  if (!raw) return null
  if (!raw.startsWith('/')) return null
  if (raw.includes('://') || raw.includes('\\') || raw.includes('//')) return null
  if (raw.startsWith('/family/join/')) return raw
  if (raw === '/family' || raw.startsWith('/family?')) return raw
  if (raw === '/zenda/copilot' || raw.startsWith('/zenda/copilot?')) return raw
  return null
}

export function familyJoinPathFromCode(raw: string | null | undefined): string | null {
  if (!raw) return null
  const code = raw.trim().toUpperCase()
  if (!/^[A-Z0-9]{6,12}$/.test(code)) return null
  return `/family/join/${encodeURIComponent(code)}`
}
