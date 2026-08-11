import { redirect } from 'next/navigation'

type Params = Promise<{ code: string }>
type Search = Promise<Record<string, string | string[] | undefined>>

/**
 * Universal invite short-link → /download?ref=CODE
 * Preserves architecture for future in-app deep link handling.
 */
export default async function InvitePage({
  params,
}: {
  params: Params
  searchParams: Search
}) {
  const { code } = await params
  redirect(`/download?ref=${encodeURIComponent(code)}`)
}
