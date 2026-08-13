import React, { useCallback, useEffect, useRef, useState } from 'react'
import { View, StyleSheet, Alert, Platform } from 'react-native'
import { Button, Text } from 'react-native-paper'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import * as WebBrowser from 'expo-web-browser'
import * as AuthSession from 'expo-auth-session'
import * as Google from 'expo-auth-session/providers/google'
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

WebBrowser.maybeCompleteAuthSession()

/**
 * expo-auth-session throws if clientId is undefined (hooks run on every render).
 * Use placeholders so Login/Register never crash when a provider is not configured yet.
 */
const GOOGLE_PLACEHOLDER = '000000000000-placeholder.apps.googleusercontent.com'
const FACEBOOK_PLACEHOLDER = '000000000000000'
const TIKTOK_RETURN_URL = 'zenda://social-callback'
const NATIVE_GOOGLE_REDIRECT = 'com.rubianejoaquim.zenda:/oauthredirect'

const FACEBOOK_DISCOVERY: AuthSession.DiscoveryDocument = {
  authorizationEndpoint: 'https://www.facebook.com/v21.0/dialog/oauth',
  tokenEndpoint: 'https://graph.facebook.com/v21.0/oauth/access_token',
}

function googleNativeRedirectUri(iosClientId: string): string {
  if (
    Platform.OS === 'ios' &&
    iosClientId &&
    iosClientId !== GOOGLE_PLACEHOLDER &&
    iosClientId.endsWith('.apps.googleusercontent.com')
  ) {
    const clientKey = iosClientId.replace(/\.apps\.googleusercontent\.com$/, '')
    return `com.googleusercontent.apps.${clientKey}:/oauthredirect`
  }
  return NATIVE_GOOGLE_REDIRECT
}

function paramFromUrl(url: string, key: string): string {
  const hash = url.split('#')[1] || ''
  const query = (url.split('?')[1] || '').split('#')[0]
  const source = `${query}&${hash}`
  const match = source.match(new RegExp(`(?:^|[&])${key}=([^&]*)`))
  return match ? decodeURIComponent(match[1].replace(/\+/g, ' ')) : ''
}

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

  const googleWebClientId =
    process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID || config?.google_client_id || ''
  const googleIosClientId =
    process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID ||
    config?.google_client_id_ios ||
    googleWebClientId
  const googleAndroidClientId =
    config?.google_client_id_android ||
    process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID ||
    googleWebClientId
  const facebookAppId =
    process.env.EXPO_PUBLIC_FACEBOOK_APP_ID || config?.facebook_app_id || ''

  const facebookRedirectUri = `fb${facebookAppId || FACEBOOK_PLACEHOLDER}://authorize`

  const googleAuthClientId = googleWebClientId || GOOGLE_PLACEHOLDER
  const [googleRequest, googleResponse, googlePrompt] = Google.useIdTokenAuthRequest(
    {
      clientId: googleAuthClientId,
      webClientId: googleAuthClientId,
      iosClientId: googleIosClientId || googleAuthClientId,
      androidClientId: googleAndroidClientId || googleAuthClientId,
      selectAccount: true,
    },
    { native: googleNativeRedirectUri(googleIosClientId || googleAuthClientId) }
  )

  const [fbRequest, fbResponse, fbPrompt] = AuthSession.useAuthRequest(
    {
      clientId: facebookAppId || FACEBOOK_PLACEHOLDER,
      redirectUri: facebookRedirectUri,
      scopes: ['public_profile', 'email'],
      responseType: AuthSession.ResponseType.Token,
      usePKCE: false,
      extraParams: { display: 'popup' },
    },
    FACEBOOK_DISCOVERY
  )

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
      Alert.alert(t('auth.login.signIn'), data.message || t('auth.social.loginFailed'))
    },
    [onLinkRequired, onSuccess, t]
  )

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
          Alert.alert('TikTok', getApiErrorMessage(err, t('auth.social.tiktokFailed')))
        } finally {
          setBusy(null)
        }
        return
      }
      const token = paramFromUrl(url, 'token')
      if (token) {
        await authApi.setSessionToken(token)
        const user = await authApi.me()
        onSuccess({ user, token })
        return
      }
      Alert.alert('TikTok', paramFromUrl(url, 'message') || t('auth.social.tiktokFailed'))
    },
    [handleSocialResult, onLinkRequired, onSuccess, t]
  )

  useEffect(() => {
    const sub = Linking.addEventListener('url', (event) => {
      void finishTikTokFromUrl(event.url)
    })
    return () => sub.remove()
  }, [finishTikTokFromUrl])

  useEffect(() => {
    const run = async () => {
      if (googleResponse?.type === 'dismiss' || googleResponse?.type === 'cancel') {
        return
      }
      if (googleResponse?.type === 'error') {
        Alert.alert(
          'Google',
          googleResponse.error?.message || t('auth.social.googleFailed')
        )
        return
      }
      if (googleResponse?.type !== 'success') return
      const idToken =
        googleResponse.params.id_token ||
        googleResponse.authentication?.idToken ||
        paramFromUrl(googleResponse.url || '', 'id_token')
      if (!idToken) {
        logger.error('Google auth succeeded without id_token')
        Alert.alert('Google', t('auth.social.googleFailed'))
        return
      }
      setBusy('google')
      try {
        const data = await authApi.socialGoogle(idToken)
        await handleSocialResult(data)
      } catch (err) {
        Alert.alert('Google', getApiErrorMessage(err, t('auth.social.googleFailed')))
      } finally {
        setBusy(null)
      }
    }
    void run()
  }, [googleResponse, handleSocialResult, t])

  useEffect(() => {
    const run = async () => {
      if (fbResponse?.type === 'dismiss' || fbResponse?.type === 'cancel') {
        return
      }
      if (fbResponse?.type === 'error') {
        Alert.alert(
          'Facebook',
          fbResponse.error?.message || t('auth.social.facebookFailed')
        )
        return
      }
      if (fbResponse?.type !== 'success') return
      const accessToken =
        fbResponse.authentication?.accessToken ||
        fbResponse.params.access_token ||
        paramFromUrl(fbResponse.url || '', 'access_token')
      if (!accessToken) {
        logger.error('Facebook auth succeeded without access_token')
        Alert.alert('Facebook', t('auth.social.facebookFailed'))
        return
      }
      setBusy('facebook')
      try {
        const data = await authApi.socialFacebook(accessToken)
        await handleSocialResult(data)
      } catch (err) {
        Alert.alert(
          'Facebook',
          getApiErrorMessage(err, t('auth.social.facebookFailed'))
        )
      } finally {
        setBusy(null)
      }
    }
    void run()
  }, [fbResponse, handleSocialResult, t])

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
        Alert.alert('Apple', t('auth.social.appleFailed'))
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
      if (
        err &&
        typeof err === 'object' &&
        'code' in err &&
        (err as { code?: string }).code === 'ERR_REQUEST_CANCELED'
      ) {
        return
      }
      Alert.alert('Apple', getApiErrorMessage(err, t('auth.social.appleFailed')))
    } finally {
      setBusy(null)
    }
  }

  const handleTikTok = async () => {
    if (busy || disabled) return
    tiktokHandledRef.current = ''
    setBusy('tiktok')
    try {
      const apiRoot = getApiBaseUrl().replace(/\/api\/?$/, '')
      const startUrl = `${apiRoot}/api/auth/social/tiktok/?client=mobile&purpose=login&redirect=${encodeURIComponent('/')}`
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
      Alert.alert('TikTok', getApiErrorMessage(err, t('auth.social.tiktokFailed')))
    } finally {
      if (!tiktokHandledRef.current) setBusy(null)
    }
  }

  // Prefer API flags; fall back to baked EXPO_PUBLIC IDs so production builds
  // still show Google if /social/config is briefly unreachable.
  // Facebook requires backend enablement (app id + secret) — do not show on env alone.
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

  const promptOptions = { showInRecents: true, preferEphemeralSession: true }

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
          disabled={disabled || !!busy || !googleRequest}
          loading={busy === 'google'}
          onPress={() => {
            if (!googleRequest) return
            void googlePrompt(promptOptions).catch((err: unknown) => {
              Alert.alert('Google', getApiErrorMessage(err, t('auth.social.googleFailed')))
            })
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
          disabled={disabled || !!busy || !fbRequest}
          loading={busy === 'facebook'}
          onPress={() => {
            if (!fbRequest || !facebookAppId) return
            void fbPrompt(promptOptions).catch((err: unknown) => {
              Alert.alert(
                'Facebook',
                getApiErrorMessage(err, t('auth.social.facebookFailed'))
              )
            })
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
