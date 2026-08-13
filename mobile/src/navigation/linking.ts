import * as Linking from 'expo-linking'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { getStateFromPath as defaultGetStateFromPath, type LinkingOptions } from '@react-navigation/native'
import { Platform } from 'react-native'
import { authApi } from '../services/api'

export const ZENDA_PENDING_REF_KEY = 'ZENDA_PENDING_REF'
export const ZENDA_PENDING_FAMILY_INVITE_KEY = 'pending_family_invite'

export type RootLinkingParamList = {
  Home: undefined
  Personal: undefined
  Business: undefined
  Education: undefined
  Profile: undefined
}

const PREFIXES = [
  'zenda://',
  'https://www.rubianejoaquim.com',
  'https://rubianejoaquim.com',
]

function extractReferralCode(url: string): string | null {
  try {
    const parsed = Linking.parse(url)
    const refParam = parsed.queryParams?.ref
    if (typeof refParam === 'string' && refParam.trim()) {
      return refParam.trim().toUpperCase()
    }
    const path = (parsed.path || '').replace(/^\/+/, '')
    if (path.startsWith('invite/')) {
      const code = path.slice('invite/'.length).split('/')[0]
      if (code) return decodeURIComponent(code).trim().toUpperCase()
    }
    if (path === 'download' && typeof refParam === 'string') {
      return refParam.trim().toUpperCase()
    }
  } catch {
    // ignore malformed URLs
  }
  return null
}

/** Family join codes are separate from app-growth referral codes. */
export function extractFamilyInviteCode(url: string): string | null {
  try {
    const parsed = Linking.parse(url)
    const familyParam = parsed.queryParams?.family
    if (typeof familyParam === 'string' && familyParam.trim()) {
      return familyParam.trim().toUpperCase()
    }
    const path = (parsed.path || '').replace(/^\/+/, '')
    if (path.startsWith('family/join/')) {
      const code = path.slice('family/join/'.length).split('/')[0].split('?')[0]
      if (code) return decodeURIComponent(code).trim().toUpperCase()
    }
  } catch {
    // ignore malformed URLs
  }
  return null
}

export async function persistPendingReferral(url: string): Promise<string | null> {
  const code = extractReferralCode(url)
  if (!code) return null
  await AsyncStorage.setItem(ZENDA_PENDING_REF_KEY, code)
  authApi
    .trackReferral({
      referral_code: code,
      event_type: 'install',
      platform: Platform.OS === 'ios' ? 'ios' : Platform.OS === 'android' ? 'android' : 'web',
    })
    .catch(() => {})
  return code
}

export async function persistPendingFamilyInvite(url: string): Promise<string | null> {
  const code = extractFamilyInviteCode(url)
  if (!code) return null
  await AsyncStorage.setItem(ZENDA_PENDING_FAMILY_INVITE_KEY, code)
  return code
}

async function handleIncomingUrl(url: string | null): Promise<void> {
  if (!url) return
  await persistPendingFamilyInvite(url)
  await persistPendingReferral(url)
}

export const linking: LinkingOptions<RootLinkingParamList> = {
  prefixes: PREFIXES,
  config: {
    screens: {
      Home: {
        screens: {
          HomeMain: '',
          ToDoList: 'todo',
          Targets: 'targets',
          Notifications: 'notifications',
          AICopilot: 'ai',
          Market: 'market',
          HealthHistory: 'health',
          Analytics: 'analytics',
          FamilyFinance: 'family',
          ReceiptScanner: 'receipts',
        },
      },
      Personal: {
        screens: {
          PersonalMain: {
            path: 'personal',
            parse: {
              initialTab: (value: string) => value,
            },
          },
          MonthlyPlan: 'personal/plan',
          OrcamentoPrincipios: 'personal/principles',
          TirarDinheiroOrcamento: 'personal/budget-withdraw',
        },
      },
      Education: {
        screens: {
          EducationMain: 'education',
          CourseLessons: 'course/:courseId',
          CourseProgress: 'course/:courseId/progress',
          CourseList: 'courses',
        },
      },
      Profile: {
        screens: {
          ProfileMain: 'profile',
          Settings: 'profile/settings',
        },
      },
      Business: 'business',
    },
  },
  async getInitialURL() {
    const url = await Linking.getInitialURL()
    await handleIncomingUrl(url)
    return url
  },
  subscribe(listener) {
    const subscription = Linking.addEventListener('url', ({ url }) => {
      handleIncomingUrl(url).catch(() => {})
      listener(url)
    })
    return () => subscription.remove()
  },
  getStateFromPath(path, options) {
    const normalized = path.replace(/^\//, '')
    if (normalized.startsWith('goal/')) {
      return {
        routes: [
          {
            name: 'Personal',
            state: {
              routes: [{ name: 'PersonalMain', params: { initialTab: 'goals' } }],
            },
          },
        ],
      }
    }
    if (normalized.startsWith('family/join/')) {
      const code = decodeURIComponent(normalized.slice('family/join/'.length).split('/')[0].split('?')[0]).toUpperCase()
      return {
        routes: [
          {
            name: 'Home',
            state: {
              routes: [{ name: 'FamilyFinance', params: { inviteCode: code } }],
            },
          },
        ],
      }
    }
    if (normalized === 'download' || normalized.startsWith('download') || normalized.startsWith('invite/') || normalized === 'zenda' || normalized.startsWith('zenda')) {
      return {
        routes: [
          {
            name: 'Home',
            state: {
              routes: [{ name: 'HomeMain' }],
            },
          },
        ],
      }
    }
    return defaultGetStateFromPath(path, options)
  },
}

/** Read and optionally clear pending referral captured from deep links. */
export async function consumePendingReferral(clear = true): Promise<string | null> {
  const code = await AsyncStorage.getItem(ZENDA_PENDING_REF_KEY)
  if (code && clear) {
    await AsyncStorage.removeItem(ZENDA_PENDING_REF_KEY)
  }
  return code
}

/**
 * Deep-link matrix (handlers above):
 * Installed × iOS/Android/Web × logged-in/out × valid/invalid/expired.
 * Not installed: web /family/join/{CODE} persists cookie then store links.
 * Logged-out in app: pending_family_invite survives login.
 * Invalid/expired: FamilyFinanceScreen shows family.invalidCode.
 */
export async function consumePendingFamilyInvite(clear = true): Promise<string | null> {
  const code = await AsyncStorage.getItem(ZENDA_PENDING_FAMILY_INVITE_KEY)
  if (code && clear) {
    await AsyncStorage.removeItem(ZENDA_PENDING_FAMILY_INVITE_KEY)
  }
  return code
}
