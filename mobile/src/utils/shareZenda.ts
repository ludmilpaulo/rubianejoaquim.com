import { Platform, Share } from 'react-native'
import { authApi } from '../services/api'
import type { ShareZendaResponse } from '../types/api'
import type { User } from '../types'

type TranslateFn = (key: string) => string
type TranslateWithFn = (key: string, vars: Record<string, string | number>) => string

function fallbackShareData(user: User | null | undefined): ShareZendaResponse {
  const code = user?.referral_code?.trim() || ''
  const downloadUrl = code
    ? `https://www.rubianejoaquim.com/download?ref=${encodeURIComponent(code)}`
    : 'https://www.rubianejoaquim.com/download'
  return {
    referral_code: code,
    download_url: downloadUrl,
    invite_url: code
      ? `https://www.rubianejoaquim.com/invite/${encodeURIComponent(code)}`
      : downloadUrl,
  }
}

export async function getShareZendaData(user: User | null | undefined): Promise<ShareZendaResponse> {
  try {
    return await authApi.shareZenda()
  } catch {
    return fallbackShareData(user)
  }
}

export async function shareZendaApp(options: {
  user: User | null | undefined
  t: TranslateFn
  tw: TranslateWithFn
}): Promise<boolean> {
  const { user, t, tw } = options
  try {
    const data = await getShareZendaData(user)
    const message = tw('share.message', { url: data.download_url })
    const result = await Share.share(
      Platform.OS === 'ios'
        ? { message, url: data.download_url }
        : { message: `${message}\n${data.download_url}` },
      { dialogTitle: t('share.title') },
    )
    if (data.referral_code) {
      authApi
        .trackReferral({
          referral_code: data.referral_code,
          event_type: 'click',
          platform: Platform.OS === 'ios' ? 'ios' : Platform.OS === 'android' ? 'android' : 'web',
        })
        .catch(() => {})
    }
    return result.action === Share.sharedAction
  } catch {
    return false
  }
}
