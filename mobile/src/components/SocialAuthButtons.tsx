import React, { useEffect, useState } from 'react'
import { View, StyleSheet, Alert, Platform } from 'react-native'
import { Button, Text, ActivityIndicator } from 'react-native-paper'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import * as WebBrowser from 'expo-web-browser'
import * as AuthSession from 'expo-auth-session'
import * as Google from 'expo-auth-session/providers/google'
import * as Facebook from 'expo-auth-session/providers/facebook'
import * as Linking from 'expo-linking'
import * as AppleAuthentication from 'expo-apple-authentication'
import { authApi } from '../services/api'
import { getApiBaseUrl } from '../config/api'
import { getApiErrorMessage } from '../types/api'
import type { SocialAuthResult, SocialConfigResponse } from '../types/api'
import { logger } from '../utils/logger'
import type { User } from '../types'
import { useI18n } from '../contexts/I18nContext'

WebBrowser.maybeCompleteAuthSession()

/**
 * expo-auth-session throws if clientId is undefined (hooks run on every render).
 * Use placeholders so Login/Register never crash when a provider is not configured yet.
 */
const GOOGLE_PLACEHOLDER = '000000000000-placeholder.apps.googleusercontent.com'
const FACEBOOK_PLACEHOLDER = '000000000000000'

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

  const facebookRedirectUri = AuthSession.makeRedirectUri({
    native: `fb${facebookAppId || FACEBOOK_PLACEHOLDER}://authorize`,
  })

  // AuthSession uses a browser redirect (`com.rubianejoaquim.zenda:/oauthredirect`).
  // That works reliably with the Web OAuth client; Android/iOS native clients are
  // still accepted by the backend when verifying the ID token audience.
  const googleAuthClientId = googleWebClientId || GOOGLE_PLACEHOLDER
  const [googleRequest, googleResponse, googlePrompt] = Google.useIdTokenAuthRequest({
    clientId: googleAuthClientId,
    webClientId: googleAuthClientId,
    iosClientId: googleIosClientId || googleAuthClientId,
    androidClientId: googleAndroidClientId || googleAuthClientId,
    selectAccount: true,
  })

  const [fbRequest, fbResponse, fbPrompt] = Facebook.useAuthRequest({
    clientId: facebookAppId || FACEBOOK_PLACEHOLDER,
    iosClientId: facebookAppId || FACEBOOK_PLACEHOLDER,
    androidClientId: facebookAppId || FACEBOOK_PLACEHOLDER,
    redirectUri: facebookRedirectUri,
    scopes: ['public_profile', 'email'],
  })

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

  const handleSocialResult = async (data: SocialAuthResult) => {
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
  }

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
        ''
      if (!idToken) {
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [googleResponse])

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
        ''
      if (!accessToken) {
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fbResponse])

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
    setBusy('tiktok')
    try {
      const apiRoot = getApiBaseUrl().replace(/\/api\/?$/, '')
      const startUrl = `${apiRoot}/api/auth/social/tiktok/?client=mobile&purpose=login&redirect=${encodeURIComponent('/')}`
      // Must match backend MOBILE_OAUTH_REDIRECT_URI (zenda://social-callback)
      const redirectUrl = Linking.createURL('social-callback', { scheme: 'zenda' })
      const result = await WebBrowser.openAuthSessionAsync(startUrl, redirectUrl)
      if (result.type !== 'success' || !('url' in result) || !result.url) {
        return
      }
      const parsed = Linking.parse(result.url)
      const params = (parsed.queryParams || {}) as Record<string, string | string[] | undefined>
      const getParam = (key: string) => {
        const v = params[key]
        return Array.isArray(v) ? v[0] || '' : v || ''
      }
      const status = getParam('status')
      if (status === 'cancelled') return
      if (status === 'link_required') {
        onLinkRequired?.({
          link_token: getParam('link_token'),
          email: getParam('email'),
          provider: getParam('provider') || 'tiktok',
        })
        return
      }
      const exchangeCode = getParam('exchange_code')
      if (exchangeCode) {
        const data = await authApi.socialExchange(exchangeCode, 'tiktok')
        await handleSocialResult(data)
        return
      }
      const token = getParam('token')
      if (token) {
        await authApi.setSessionToken(token)
        const user = await authApi.me()
        onSuccess({ user, token })
        return
      }
      Alert.alert(
        'TikTok',
        getParam('message') || t('auth.social.tiktokFailed')
      )
    } catch (err) {
      Alert.alert('TikTok', getApiErrorMessage(err, t('auth.social.tiktokFailed')))
    } finally {
      setBusy(null)
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
        <ActivityIndicator size="small" color="#6366f1" />
        <Text style={styles.loadingText}>{t('auth.social.loadingOptions')}</Text>
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
          disabled={disabled || !!busy || !googleRequest}
          loading={busy === 'google'}
          onPress={() => {
            if (!googleRequest) return
            void googlePrompt({ showInRecents: true })
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
            void fbPrompt({ showInRecents: true })
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
  btn: { borderRadius: 10 },
  appleBtn: { width: '100%', height: 44 },
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
  loadingText: { color: '#6b7280', fontSize: 13 },
})
