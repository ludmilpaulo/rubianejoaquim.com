import React, { useEffect, useState } from 'react'
import { View, StyleSheet, Alert } from 'react-native'
import { Button, Text } from 'react-native-paper'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import * as WebBrowser from 'expo-web-browser'
import * as Google from 'expo-auth-session/providers/google'
import * as Facebook from 'expo-auth-session/providers/facebook'
import { authApi } from '../services/api'
import { getApiBaseUrl } from '../config/api'
import { getApiErrorMessage } from '../types/api'
import { logger } from '../utils/logger'
import type { User } from '../types'

WebBrowser.maybeCompleteAuthSession()

type SocialConfig = {
  google_client_id: string
  facebook_app_id: string
  google_enabled: boolean
  facebook_enabled: boolean
  tiktok_enabled: boolean
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
  const [config, setConfig] = useState<SocialConfig | null>(null)
  const [busy, setBusy] = useState<string | null>(null)

  const googleClientId =
    process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID || config?.google_client_id || ''
  const googleIosClientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID || googleClientId
  const googleAndroidClientId = process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID || googleClientId
  const facebookAppId =
    process.env.EXPO_PUBLIC_FACEBOOK_APP_ID || config?.facebook_app_id || ''

  const [googleRequest, googleResponse, googlePrompt] = Google.useIdTokenAuthRequest({
    clientId: googleClientId || undefined,
    iosClientId: googleIosClientId || undefined,
    androidClientId: googleAndroidClientId || undefined,
  })

  const [fbRequest, fbResponse, fbPrompt] = Facebook.useAuthRequest({
    clientId: facebookAppId || undefined,
  })

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

  const handleSocialResult = async (data: {
    status?: string
    token?: string
    user?: User
    link_token?: string
    email?: string
    provider?: string
    message?: string
  }) => {
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
    Alert.alert('Login', data.message || 'Não foi possível concluir o login social.')
  }

  useEffect(() => {
    const run = async () => {
      if (googleResponse?.type === 'dismiss' || googleResponse?.type === 'cancel') {
        return
      }
      if (googleResponse?.type !== 'success') return
      const idToken = googleResponse.params.id_token
      if (!idToken) {
        Alert.alert('Google', 'Não foi possível entrar com Google. Tente novamente.')
        return
      }
      setBusy('google')
      try {
        const data = await authApi.socialGoogle(idToken)
        await handleSocialResult(data)
      } catch (err) {
        Alert.alert('Google', getApiErrorMessage(err, 'Não foi possível entrar com Google. Tente novamente.'))
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
      if (fbResponse?.type !== 'success') return
      const accessToken = fbResponse.authentication?.accessToken
      if (!accessToken) {
        return
      }
      setBusy('facebook')
      try {
        const data = await authApi.socialFacebook(accessToken)
        await handleSocialResult(data)
      } catch (err) {
        Alert.alert(
          'Facebook',
          getApiErrorMessage(err, 'Não foi possível entrar com Facebook. Tente novamente.')
        )
      } finally {
        setBusy(null)
      }
    }
    void run()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fbResponse])

  const handleTikTok = async () => {
    if (busy || disabled) return
    setBusy('tiktok')
    try {
      const apiRoot = getApiBaseUrl().replace(/\/api\/?$/, '')
      const startUrl = `${apiRoot}/api/auth/social/tiktok/?client=mobile&purpose=login&redirect=${encodeURIComponent('/')}`
      const redirectUrl = 'zenda://social-callback'
      const result = await WebBrowser.openAuthSessionAsync(startUrl, redirectUrl)
      if (result.type !== 'success' || !('url' in result) || !result.url) {
        return
      }
      const url = new URL(result.url.replace('zenda://', 'https://callback.local/'))
      const status = url.searchParams.get('status') || ''
      if (status === 'cancelled') return
      if (status === 'link_required') {
        onLinkRequired?.({
          link_token: url.searchParams.get('link_token') || '',
          email: url.searchParams.get('email') || '',
          provider: url.searchParams.get('provider') || 'tiktok',
        })
        return
      }
      const token = url.searchParams.get('token') || ''
      if (!token) {
        Alert.alert(
          'TikTok',
          url.searchParams.get('message') || 'Não foi possível entrar com TikTok. Tente novamente.'
        )
        return
      }
      await authApi.setSessionToken(token)
      const user = await authApi.me()
      onSuccess({ user, token })
    } catch (err) {
      Alert.alert('TikTok', getApiErrorMessage(err, 'Não foi possível entrar com TikTok. Tente novamente.'))
    } finally {
      setBusy(null)
    }
  }

  if (!config) {
    return null
  }

  const googleOn = config.google_enabled && !!googleClientId
  const facebookOn = config.facebook_enabled && !!facebookAppId
  const tiktokOn = config.tiktok_enabled
  if (!googleOn && !facebookOn && !tiktokOn) {
    return null
  }

  return (
    <View style={styles.wrap}>
      {googleOn && (
        <Button
          mode="outlined"
          disabled={disabled || !!busy || !googleRequest}
          loading={busy === 'google'}
          onPress={() => {
            void googlePrompt()
          }}
          style={styles.btn}
          icon={() => <MaterialCommunityIcons name="google" size={20} color="#4285F4" />}
        >
          Continuar com Google
        </Button>
      )}
      {facebookOn && (
        <Button
          mode="contained"
          disabled={disabled || !!busy || !fbRequest}
          loading={busy === 'facebook'}
          onPress={() => {
            void fbPrompt()
          }}
          style={styles.btn}
          buttonColor="#1877F2"
          icon={() => <MaterialCommunityIcons name="facebook" size={20} color="#fff" />}
        >
          Continuar com Facebook
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
          Continuar com TikTok
        </Button>
      )}
      <View style={styles.dividerRow}>
        <View style={styles.line} />
        <Text style={styles.or}>ou</Text>
        <View style={styles.line} />
      </View>
      <Text style={styles.emailHint}>Continuar com email</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: { marginBottom: 12, gap: 8 },
  btn: { borderRadius: 10 },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 4,
  },
  line: { flex: 1, height: 1, backgroundColor: '#e5e7eb' },
  or: { marginHorizontal: 10, color: '#6b7280', fontSize: 13 },
  emailHint: { textAlign: 'center', color: '#6b7280', fontSize: 13, marginBottom: 4 },
})
