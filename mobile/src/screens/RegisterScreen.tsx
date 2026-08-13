import React, { useState } from 'react'
import { View, StyleSheet, KeyboardAvoidingView, Platform, ScrollView, TouchableOpacity, Alert } from 'react-native'
import { TextInput, Button, Text, Card } from 'react-native-paper'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useAppDispatch } from '../hooks/redux'
import { register, socialSession, checkPaidAccess } from '../store/authSlice'
import SocialAuthButtons from '../components/SocialAuthButtons'
import ScreenErrorBoundary from '../components/ScreenErrorBoundary'
import { authApi } from '../services/api'
import type { StackScreenProps } from '@react-navigation/stack'
import type { AuthStackParamList } from '../navigation/AuthNavigator'
import { useI18n } from '../contexts/I18nContext'
import { useActionFeedback } from '../hooks/useActionFeedback'
import { getApiErrorMessage } from '../types/api'
import { ZendaLogo } from '../components/ui'
import AuthLegalFooter from '../components/AuthLegalFooter'

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

type Props = StackScreenProps<AuthStackParamList, 'Register'>

export default function RegisterScreen({ navigation }: Props) {
  const dispatch = useAppDispatch()
  const { t, tw, resolve } = useI18n()
  const feedback = useActionFeedback()
  const [email, setEmail] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [passwordConfirm, setPasswordConfirm] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [linkState, setLinkState] = useState<{
    link_token: string
    email: string
    provider: string
  } | null>(null)
  const [linkPassword, setLinkPassword] = useState('')

  const handleRegister = () => {
    setError('')
    if (!email.trim() || !username.trim() || !password || !passwordConfirm || !firstName.trim() || !lastName.trim()) {
      setError(t('auth.register.fillAllFields'))
      return
    }
    if (!EMAIL_PATTERN.test(email.trim())) {
      setError(t('auth.register.invalidEmail'))
      return
    }
    if (password.length < 8) {
      setError(t('auth.register.passwordMinLength'))
      return
    }
    if (password !== passwordConfirm) {
      setError(t('auth.register.passwordsMismatch'))
      return
    }

    void feedback.run(
      async () => {
        await dispatch(
          register({
            email: email.trim(),
            username: username.trim(),
            password,
            password_confirm: passwordConfirm,
            first_name: firstName.trim(),
            last_name: lastName.trim(),
          }),
        ).unwrap()
        await dispatch(checkPaidAccess()).unwrap()
        Alert.alert(t('auth.register.accountCreatedTitle'), t('auth.register.accountCreatedMessage'))
        navigation.replace('AccessDenied')
      },
      {
        pendingKey: 'register',
        pendingMessage: 'feedback.creatingAccount',
        silentError: true,
        onError: (err: unknown) => {
          const raw =
            (err && typeof err === 'object' && 'payload' in err && (err as { payload?: string }).payload) ||
            (err instanceof Error ? err.message : null) ||
            'api.errors.register.failed'
          const msg = typeof raw === 'string' ? resolve(raw) : JSON.stringify(raw)
          setError(msg)
          Alert.alert(t('auth.register.errorTitle'), typeof raw === 'string' ? msg : t('auth.register.verifyData'))
        },
      },
    )
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        <View style={styles.backgroundDecor}>
          <View style={styles.circle1} />
          <View style={styles.circle2} />
        </View>
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          <Card style={styles.card} elevation={8 as 0 | 1 | 2 | 3 | 4 | 5}>
            <Card.Content style={styles.cardContent}>
              <TouchableOpacity
                style={styles.backButton}
                onPress={() => navigation.goBack()}
                disabled={feedback.anyPending}
              >
                <MaterialCommunityIcons name="arrow-left" size={24} color="#3534C9" />
              </TouchableOpacity>
              <View style={styles.logoContainer}>
                <ZendaLogo size="large" variant="full" />
              </View>
              <Text variant="headlineMedium" style={styles.title}>
                {t('auth.register.title')}
              </Text>
              <Text variant="bodyMedium" style={styles.subtitle}>
                {t('auth.register.subtitle')}
              </Text>

              <ScreenErrorBoundary>
                <SocialAuthButtons
                  disabled={feedback.anyPending}
                  onSuccess={async ({ user, token }) => {
                    await feedback.run(
                      async () => {
                        await dispatch(socialSession({ user, token })).unwrap()
                        await dispatch(checkPaidAccess()).unwrap()
                        Alert.alert(t('auth.register.accountCreatedTitle'), t('auth.register.accountCreatedMessage'))
                        navigation.replace('AccessDenied')
                      },
                      {
                        pendingKey: 'social',
                        pendingMessage: 'feedback.creatingAccount',
                        silentError: true,
                        onError: () => {
                          setError(t('auth.register.verifyData'))
                        },
                      },
                    )
                  }}
                  onLinkRequired={(payload) => {
                    setLinkState(payload)
                    setError('')
                  }}
                />
              </ScreenErrorBoundary>

              {linkState ? (
                <View style={styles.linkBox}>
                  <Text style={styles.linkText}>
                    {tw('auth.social.linkBody', {
                      email: linkState.email,
                      provider: linkState.provider,
                    })}
                  </Text>
                  <TextInput
                    label={t('auth.social.linkPassword')}
                    value={linkPassword}
                    onChangeText={setLinkPassword}
                    mode="outlined"
                    secureTextEntry
                    style={styles.input}
                  />
                  <Button
                    mode="contained"
                    {...feedback.buttonProps('socialLink')}
                    disabled={feedback.isPending('socialLink') || !linkPassword}
                    onPress={() => {
                      void feedback.run(
                        async () => {
                          setError('')
                          const data = await authApi.socialLinkConfirm(linkState.link_token, linkPassword)
                          if (data.token && data.user) {
                            await dispatch(socialSession({ user: data.user, token: data.token })).unwrap()
                            await dispatch(checkPaidAccess()).unwrap()
                            setLinkState(null)
                            setLinkPassword('')
                            Alert.alert(
                              t('auth.register.accountCreatedTitle'),
                              t('auth.register.accountCreatedMessage'),
                            )
                            navigation.replace('AccessDenied')
                          }
                        },
                        {
                          pendingKey: 'socialLink',
                          pendingMessage: 'feedback.creatingAccount',
                          silentError: true,
                          onError: (err: unknown) => {
                            const msg = getApiErrorMessage(err, t('auth.social.linkFailed'))
                            setError(msg)
                            Alert.alert(t('auth.social.linkTitle'), msg)
                          },
                        },
                      )
                    }}
                    buttonColor="#b45309"
                    style={styles.button}
                  >
                    {feedback.actionLabel('auth.social.linkConfirm', 'socialLink', 'feedback.creatingAccount')}
                  </Button>
                </View>
              ) : null}

              {error ? (
                <View style={styles.errorContainer}>
                  <MaterialCommunityIcons name="alert-circle" size={20} color="#d32f2f" />
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              ) : null}

              <TextInput
                label={t('auth.register.firstName')}
                value={firstName}
                onChangeText={setFirstName}
                mode="outlined"
                style={styles.input}
                autoCapitalize="words"
              />
              <TextInput
                label={t('auth.register.lastName')}
                value={lastName}
                onChangeText={setLastName}
                mode="outlined"
                style={styles.input}
                autoCapitalize="words"
              />
              <TextInput
                label={t('auth.register.email')}
                value={email}
                onChangeText={setEmail}
                mode="outlined"
                style={styles.input}
                keyboardType="email-address"
                autoCapitalize="none"
              />
              <TextInput
                label={t('auth.register.username')}
                value={username}
                onChangeText={setUsername}
                mode="outlined"
                style={styles.input}
                autoCapitalize="none"
              />
              <TextInput
                label={t('auth.register.password')}
                value={password}
                onChangeText={setPassword}
                mode="outlined"
                secureTextEntry={!showPassword}
                style={styles.input}
                right={
                  <TextInput.Icon
                    icon={showPassword ? 'eye-off' : 'eye'}
                    onPress={() => setShowPassword(!showPassword)}
                  />
                }
              />
              <TextInput
                label={t('auth.register.confirmPassword')}
                value={passwordConfirm}
                onChangeText={setPasswordConfirm}
                mode="outlined"
                secureTextEntry={!showPassword}
                style={styles.input}
              />

              <Button
                mode="contained"
                onPress={handleRegister}
                {...feedback.buttonProps('register')}
                style={styles.button}
                buttonColor="#3534C9"
                contentStyle={styles.buttonContent}
                labelStyle={styles.buttonLabel}
              >
                {feedback.actionLabel('auth.register.createAccount', 'register', 'feedback.creatingAccount')}
              </Button>

              <TouchableOpacity
                style={styles.loginLink}
                onPress={() => navigation.navigate('Login')}
                disabled={feedback.anyPending}
              >
                <Text style={styles.loginLinkText}>{t('auth.register.hasAccount')} </Text>
                <Text style={styles.loginLinkBold}>{t('auth.register.signIn')}</Text>
              </TouchableOpacity>

              <AuthLegalFooter />
            </Card.Content>
          </Card>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
    position: 'relative',
  },
  backgroundDecor: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    top: 0,
    left: 0,
  },
  circle1: {
    position: 'absolute',
    width: 250,
    height: 250,
    borderRadius: 125,
    backgroundColor: '#3534C9',
    opacity: 0.06,
    top: -80,
    right: -80,
  },
  circle2: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: '#3C3BD4',
    opacity: 0.06,
    bottom: -60,
    left: -60,
  },
  scrollContent: {
    flexGrow: 1,
    padding: 20,
    paddingVertical: 24,
    zIndex: 1,
  },
  card: {
    borderRadius: 24,
    backgroundColor: '#ffffff',
    shadowColor: '#3534C9',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 8,
  },
  cardContent: {
    padding: 24,
  },
  backButton: {
    position: 'absolute',
    top: 16,
    left: 16,
    zIndex: 1,
    padding: 4,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  logoCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#f0f4ff',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#e0e7ff',
  },
  title: {
    textAlign: 'center',
    marginBottom: 8,
    fontWeight: '700',
    color: '#1f2937',
    letterSpacing: -0.5,
  },
  subtitle: {
    textAlign: 'center',
    marginBottom: 24,
    color: '#6b7280',
    lineHeight: 20,
  },
  input: {
    marginBottom: 14,
  },
  button: {
    marginTop: 8,
    marginBottom: 16,
  },
  buttonContent: {
    paddingVertical: 4,
  },
  buttonLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 14,
    borderRadius: 12,
    marginBottom: 16,
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fca5a5',
  },
  errorText: {
    flex: 1,
    fontSize: 14,
    color: '#d32f2f',
  },
  loginLink: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 8,
  },
  loginLinkText: {
    fontSize: 14,
    color: '#6b7280',
  },
  loginLinkBold: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3534C9',
  },
  linkBox: {
    backgroundColor: '#fffbeb',
    borderWidth: 1,
    borderColor: '#fcd34d',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  linkText: {
    color: '#92400e',
    fontSize: 13,
    marginBottom: 8,
    lineHeight: 18,
  },
})
