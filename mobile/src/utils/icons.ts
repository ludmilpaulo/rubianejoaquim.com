import type { MaterialCommunityIcons } from '@expo/vector-icons'

export type MaterialIconName = keyof typeof MaterialCommunityIcons.glyphMap

/** Map API/category icon strings to a valid MaterialCommunityIcons name. */
export function materialIcon(name: string | undefined | null, fallback: MaterialIconName = 'tag'): MaterialIconName {
  const key = (name || fallback) as MaterialIconName
  return key
}
