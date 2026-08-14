import React, { useCallback, useEffect, useRef, useState } from 'react'
import { View, StyleSheet, Alert, Platform } from 'react-native'
import { Button, Text } from 'react-native-paper'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import * as WebBrowser from 'expo-web-browser'
import * as Linking from 'expo-linking'
import * as AppleAuthentication from 'expo-apple-authentication'
import { authApi } from '../services/api'
import { getApiBaseUrl } from '../config/api'
import { getApiErrorMessage } from '../types/api'
import type { SocialAuthResult, SocialConfigResponse } from '../types/api'
import { logger } from '../utils/logger'
import type { User } from '../types'
import { useI18n } from '../contexts/I18nContext'
import { ZendaLoader } from './ui/ZendaLoader'
import {
  hasFacebookNative,
  hasGoogleSignInNative,
  isSocialCancelError,
  loadFacebookSdk,
  loadGoogleSignIn,
} from '../services/nativeSocialAuth'

WebBrowser.maybeCompleteAuthSession()

const TIKTOK_RETURN_URL = 'zenda://social-callback'

function paramFromUrl(url: string, key: string): string {
  const hash = url.split('#')[1] || ''
  const query = (url.split('?')[1] || '').split('#')[0]
  const source = `${query}&${hash}`
  const match = source.match(new RegExp(`(?:^|[&])${key}=([^&]*)`))
  return match ? decodeURIComponent(match[1].replace(/\+/g, ' ')) : ''
}

function isNativeModuleMissing(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err)
  return /native module|RNGoogleSignin|FBSDK|TurboModuleRegistry|not found/i.test(msg)
}

type SocialProvider = 'google' | 'facebook' | 'tiktok' | 'apple'

type Props = {
  onSuccess: (payload: { user: User; token: string }) => void
  onLinkRequired?: (payload: {
    link_token: string
    email: string
    provider: string
    message?: string
  }) => void
  disabled?: boolean
}

export default function SocialAuthButtons({ onSuccess, onLinkRequired, disabled }: Props) {
  const { t } = useI18n()
  const [config, setConfig] = useState<SocialConfigResponse | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [appleAvailable, setAppleAvailable] = useState(false)
  const tiktokHandledRef = useRef('')
  const googleConfiguredRef = useRef('')
  const facebookInitRef = useRef(false)
  const startTikTokRef = useRef<() => void>(() => undefined)

  const googleWebClientId =
    process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID || config?.google_client_id || ''
  const googleIosClientId =
    process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID ||
    config?.google_client_id_ios ||
    googleWebClientId
  const facebookAppId =
    process.env.EXPO_PUBLIC_FACEBOOK_APP_ID || config?.facebook_app_id || ''

  useEffect(() => {
    void WebBrowser.warmUpAsync().catch(() => undefined)
    return () => {
      void WebBrowser.coolDownAsync().catch(() => undefined)
    }
  }, [])

  useEffect(() => {
    if (Platform.OS !== 'ios') return
    AppleAuthentication.isAvailableAsync()
      .then(setAppleAvailable)
      .catch(() => setAppleAvailable(false))
  }, [])

  useEffect(() => {
    let cancelled = false
    authApi
      .socialConfig()
      .then((data) => {
        if (!cancelled) setConfig(data)
      })
      .catch((err) => {
        logger.error('socialConfig failed', err)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const showFailure = useCallback(
    (provider: SocialProvider, retry: () => void, override?: string) => {
      const detail =
        override ||
        (provider === 'google'
          ? t('auth.social.googleDetail')
          : provider === 'facebook'
            ? t('auth.social.facebookDetail')
            : provider === 'tiktok'
              ? t('auth.social.tiktokDetail')
              : t('auth.social.appleDetail'))
      Alert.alert(t('auth.social.unableTitle'), detail, [
        { text: t('auth.social.useEmail'), style: 'cancel' },
        { text: t('auth.social.tryAgain'), onPress: retry },
      ])
    },
    [t]
  )

  const handleSocialResult = useCallback(
    async (data: SocialAuthResult) => {
      if (data.status === 'link_required' && data.link_token) {
        onLinkRequired?.({
          link_token: data.link_token,
          email: data.email || '',
          provider: data.provider || '',
          message: data.message,
        })
        return
      }
      if (data.status === 'cancelled') return
      if (data.token && data.user) {
        onSuccess({ user: data.user, token: data.token })
        return
      }
      Alert.alert(t('auth.social.unableTitle'), data.message || t('auth.social.loginFailed'))
    },
    [onLinkRequired, onSuccess, t]
  )

  const ensureGoogleConfigured = useCallback((): boolean => {
    const google = loadGoogleSignIn()
    if (!google || !googleWebClientId) return false
    const key = `${googleWebClientId}|${googleIosClientId}`
    if (googleConfiguredRef.current === key) return true
    google.GoogleSignin.configure({
      webClientId: googleWebClientId,
      offlineAccess: false,
      ...(googleIosClientId ? { iosClientId: googleIosClientId } : {}),
    })
    googleConfiguredRef.current = key
    return true
  }, [googleIosClientId, googleWebClientId])

  const handleGoogle = useCallback(async () => {
    if (busy || disabled) return
    setBusy('google')
    const google = loadGoogleSignIn()
    try {
      if (!google || !hasGoogleSignInNative()) {
        showFailure(
          'google',
          () => {
            void handleGoogle()
          },
          t('auth.social.needsNativeBuild')
        )
        return
      }
      if (!ensureGoogleConfigured()) {
        showFailure(
          'google',
          () => {
            void handleGoogle()
          },
          t('auth.social.needsNativeBuild')
        )
        return
      }
      if (Platform.OS === 'android') {
        await google.GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true })
      }
      const response = await google.GoogleSignin.signIn()
      if (!google.isSuccessResponse(response)) {
        return
      }
      let idToken = response.data.idToken
      if (!idToken) {
        const tokens = await google.GoogleSignin.getTokens()
        idToken = tokens.idToken
      }
      if (!idToken) {
        logger.error('Google auth succeeded without id_token')
        showFailure('google', () => {
          void handleGoogle()
        })
        return
      }
      const data = await authApi.socialGoogle(idToken, Platform.OS)
      await handleSocialResult(data)
    } catch (err) {
      if (isSocialCancelError(err, google)) return
      logger.error('Google native sign-in failed', err)
      showFailure(
        'google',
        () => {
          void handleGoogle()
        },
        isNativeModuleMissing(err)
          ? t('auth.social.needsNativeBuild')
          : getApiErrorMessage(err, t('auth.social.googleDetail'))
      )
    } finally {
      setBusy(null)
    }
  }, [busy, disabled, ensureGoogleConfigured, handleSocialResult, showFailure, t])

  const handleFacebook = useCallback(async () => {
    if (busy || disabled || !facebookAppId) return
    setBusy('facebook')
    const facebook = loadFacebookSdk()
    try {
      if (!facebook || !hasFacebookNative()) {
        showFailure(
          'facebook',
          () => {
            void handleFacebook()
          },
          t('auth.social.needsNativeBuild')
        )
        return
      }
      if (!facebookInitRef.current) {
        facebook.Settings.setAppID(facebookAppId)
        const facebookClientToken = process.env.EXPO_PUBLIC_FACEBOOK_CLIENT_TOKEN || ''
        if (facebookClientToken) {
          facebook.Settings.setClientToken(facebookClientToken)
        }
        facebook.Settings.initializeSDK()
        facebookInitRef.current = true
      }
      const result = await facebook.LoginManager.logInWithPermissions(['public_profile', 'email'])
      if (result.isCancelled) return
      const tokenData = await facebook.AccessToken.getCurrentAccessToken()
      const accessToken = tokenData?.accessToken
      if (!accessToken) {
        logger.error('Facebook auth succeeded without access_token')
        showFailure('facebook', () => {
          void handleFacebook()
        })
        return
      }
      const data = await authApi.socialFacebook(accessToken, Platform.OS)
      await handleSocialResult(data)
    } catch (err) {
      if (isSocialCancelError(err)) return
      logger.error('Facebook native sign-in failed', err)
      showFailure(
        'facebook',
        () => {
          void handleFacebook()
        },
        isNativeModuleMissing(err)
          ? t('auth.social.needsNativeBuild')
          : getApiErrorMessage(err, t('auth.social.facebookDetail'))
      )
    } finally {
      setBusy(null)
    }
  }, [busy, disabled, facebookAppId, handleSocialResult, showFailure, t])

  const finishTikTokFromUrl = useCallback(
    async (url: string) => {
      if (!url.includes('social-callback')) return
      if (tiktokHandledRef.current === url) return
      tiktokHandledRef.current = url

      const status = paramFromUrl(url, 'status')
      if (status === 'cancelled') return
      if (status === 'link_required') {
        onLinkRequired?.({
          link_token: paramFromUrl(url, 'link_token'),
          email: paramFromUrl(url, 'email'),
          provider: paramFromUrl(url, 'provider') || 'tiktok',
        })
        return
      }
      const exchangeCode = paramFromUrl(url, 'exchange_code')
      if (exchangeCode) {
        setBusy('tiktok')
        try {
          const data = await authApi.socialExchange(exchangeCode, 'tiktok')
          await handleSocialResult(data)
        } catch (err) {
          showFailure(
            'tiktok',
            () => {
              startTikTokRef.current()
            },
            getApiErrorMessage(err, t('auth.social.tiktokDetail'))
          )
        } finally {
          setBusy(null)
        }
        return
      }
      showFailure('tiktok', () => {
        startTikTokRef.current()
      }, paramFromUrl(url, 'message') || t('auth.social.tiktokDetail'))
    },
    [handleSocialResult, onLinkRequired, showFailure, t]
  )

  const handleTikTok = useCallback(async () => {
    if (busy || disabled) return
    tiktokHandledRef.current = ''
    setBusy('tiktok')
    try {
      const apiRoot = getApiBaseUrl().replace(/\/api\/?$/, '')
      const startUrl = `${apiRoot}/api/auth/social/tiktok/?client=mobile&purpose=login&redirect=${encodeURIComponent('/')}&platform=${encodeURIComponent(Platform.OS)}`
      const result = await WebBrowser.openAuthSessionAsync(startUrl, TIKTOK_RETURN_URL, {
        preferEphemeralSession: true,
        showInRecents: true,
      })
      if (result.type === 'success' && 'url' in result && result.url) {
        await finishTikTokFromUrl(result.url)
        return
      }
      if (result.type === 'cancel' || result.type === 'dismiss') {
        await new Promise((resolve) => setTimeout(resolve, 800))
        if (tiktokHandledRef.current) return
      }
    } catch (err) {
      showFailure(
        'tiktok',
        () => {
          void handleTikTok()
        },
        getApiErrorMessage(err, t('auth.social.tiktokDetail'))
      )
    } finally {
      if (!tiktokHandledRef.current) setBusy(null)
    }
  }, [busy, disabled, finishTikTokFromUrl, showFailure, t])

  startTikTokRef.current = () => {
    void handleTikTok()
  }

  useEffect(() => {
    const sub = Linking.addEventListener('url', (event) => {
      void finishTikTokFromUrl(event.url)
    })
    return () => sub.remove()
  }, [finishTikTokFromUrl])

  const handleApple = async () => {
    if (busy || disabled) return
    setBusy('apple')
    try {
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      })
      if (!credential.identityToken) {
        showFailure('apple', () => {
          void handleApple()
        })
        return
      }
      const fullName = credential.fullName
        ? {
            givenName: credential.fullName.givenName ?? undefined,
            familyName: credential.fullName.familyName ?? undefined,
          }
        : undefined
      const data = await authApi.socialApple(credential.identityToken, fullName)
      await handleSocialResult(data)
    } catch (err) {
      if (isSocialCancelError(err)) return
      showFailure(
        'apple',
        () => {
          void handleApple()
        },
        getApiErrorMessage(err, t('auth.social.appleDetail'))
      )
    } finally {
      setBusy(null)
    }
  }

  const googleOn =
    !!googleWebClientId &&
    (config?.google_enabled ?? !!process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID)
  const facebookEnabled = !!facebookAppId && config?.facebook_enabled === true
  const tiktokOn = config?.tiktok_enabled === true
  const appleOn =
    Platform.OS === 'ios' && (config?.apple_enabled !== false) && appleAvailable

  if (!config && !googleOn && !appleOn) {
    return (
      <View style={styles.loadingWrap}>
        <ZendaLoader inline message={t('auth.social.loadingOptions')} />
      </View>
    )
  }
  if (!googleOn && !facebookEnabled && !tiktokOn && !appleOn) {
    return null
  }

  return (
    <View style={styles.wrap}>
      {appleOn && (
        <AppleAuthentication.AppleAuthenticationButton
          buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
          buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.WHITE_OUTLINE}
          cornerRadius={10}
          style={styles.appleBtn}
          onPress={() => {
            if (busy || disabled) return
            void handleApple()
          }}
        />
      )}
      {googleOn && (
        <Button
          mode="outlined"
          disabled={disabled || !!busy}
          loading={busy === 'google'}
          onPress={() => {
            void handleGoogle()
          }}
          style={styles.btn}
          icon={() => <MaterialCommunityIcons name="google" size={20} color="#4285F4" />}
        >
          {t('auth.social.continueGoogle')}
        </Button>
      )}
      {facebookEnabled && (
        <Button
          mode="contained"
          disabled={disabled || !!busy}
          loading={busy === 'facebook'}
          onPress={() => {
            void handleFacebook()
          }}
          style={styles.btn}
          buttonColor="#1877F2"
          icon={() => <MaterialCommunityIcons name="facebook" size={20} color="#fff" />}
        >
          {t('auth.social.continueFacebook')}
        </Button>
      )}
      {tiktokOn && (
        <Button
          mode="contained"
          disabled={disabled || !!busy}
          loading={busy === 'tiktok'}
          onPress={() => {
            void handleTikTok()
          }}
          style={styles.btn}
          buttonColor="#111"
          icon={() => <MaterialCommunityIcons name="music-note" size={20} color="#fff" />}
        >
          {t('auth.social.continueTikTok')}
        </Button>
      )}
      <View style={styles.dividerRow}>
        <View style={styles.line} />
        <Text style={styles.or}>{t('auth.login.or')}</Text>
        <View style={styles.line} />
      </View>
      <Text style={styles.emailHint}>{t('auth.social.continueEmail')}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: { marginBottom: 12, gap: 8 },
  btn: { borderRadius: 12 },
  appleBtn: { width: '100%', height: 48 },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 4,
  },
  line: { flex: 1, height: 1, backgroundColor: '#e5e7eb' },
  or: { marginHorizontal: 10, color: '#6b7280', fontSize: 13 },
  emailHint: { textAlign: 'center', color: '#6b7280', fontSize: 13, marginBottom: 4 },
  loadingWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 8,
    marginBottom: 8,
  },
})
