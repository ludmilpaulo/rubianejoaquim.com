import * as Localization from 'expo-localization'

export const ANGOLA_REGION_CODE = 'AO'

/** ISO 3166-1 alpha-2 region from device (e.g. AO, US, PT). */
export function getDeviceRegionCode(): string | undefined {
  const locales = Localization.getLocales()
  const primary = locales[0]
  if (primary?.regionCode) {
    return primary.regionCode.toUpperCase()
  }

  const tag = primary?.languageTag
  if (tag?.includes('-')) {
    const part = tag.split('-').pop()
    if (part && part.length === 2) {
      return part.toUpperCase()
    }
  }

  return undefined
}

export function isDeviceInAngola(): boolean {
  return getDeviceRegionCode() === ANGOLA_REGION_CODE
}
