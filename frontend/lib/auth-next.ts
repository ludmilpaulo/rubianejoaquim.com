const ALLOWED_NEXT_PREFIXES = [
  '/family',
  '/zenda/copilot',
  '/instructor',
  '/subscribe',
  '/admin',
  '/area-do-aluno',
  '/cursos',
  '/aulas',
  '/mentoria',
] as const

/** Allow only same-origin relative paths used after login. */
export function safeAuthNext(raw: string | null | undefined): string | null {
  if (!raw) return null
  if (!raw.startsWith('/')) return null
  if (raw.includes('://') || raw.includes('\\') || raw.includes('//')) return null
  if (raw === '/login' || raw.startsWith('/login?')) return null
  if (ALLOWED_NEXT_PREFIXES.some((prefix) => raw === prefix || raw.startsWith(`${prefix}/`) || raw.startsWith(`${prefix}?`))) {
    return raw
  }
  return null
}

export function familyJoinPathFromCode(raw: string | null | undefined): string | null {
  if (!raw) return null
  const code = raw.trim().toUpperCase()
  if (!/^[A-Z0-9]{6,12}$/.test(code)) return null
  return `/family/join/${encodeURIComponent(code)}`
}
