import React, { useState, useEffect } from 'react'
import { View, StyleSheet, KeyboardAvoidingView, Platform, ScrollView, TouchableOpacity, Alert } from 'react-native'
import { TextInput, Button, Text, Card, Checkbox } from 'react-native-paper'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useAppDispatch } from '../hooks/redux'
import { login } from '../store/authSlice'
import type { StackScreenProps } from '@react-navigation/stack'
import type { AuthStackParamList } from '../navigation/AuthNavigator'
import { useI18n } from '../contexts/I18nContext'
import { getApiBaseUrl } from '../config/api'
import { getThunkErrorMessage } from '../utils/thunkError'
import { logger } from '../utils/logger'
import { isApiError } from '../types/api'

type Props = StackScreenProps<AuthStackParamList, 'Login'>
import {
  isBiometricAvailable,
  getBiometricType,
  authenticateWithBiometric,
  isBiometricEnabled,
  enableBiometric,
  getBiometricCredentials,
  clearBiometricCredentials,
} from '../utils/biometric'

function isUserNotFound(msg: string) {
  return (
    msg.includes('não encontrado') ||
    msg.includes('not found') ||
    msg.includes('introuvable') ||
    msg.includes('no encontrado')
  )
}

function isWrongPassword(msg: string) {
  return (
    msg.includes('incorreta') ||
    msg.includes('incorrect') ||
    msg.includes('incorrecte') ||
    msg.includes('incorrecta')
  )
}

function isConnectionError(msg: string) {
  return (
    msg === 'api.errors.network' ||
    msg.includes('conectar') ||
    msg.includes('connect') ||
    msg.includes('connexion') ||
    msg.includes('conectar al servidor') ||
    msg.includes('Network Error') ||
    msg.includes('timeout')
  )
}

export default function LoginScreen({ navigation }: Props) {
  const dispatch = useAppDispatch()
  const { t, tw, resolve } = useI18n()
  const [emailOrUsername, setEmailOrUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [biometricAvailable, setBiometricAvailable] = useState(false)
  const [biometricType, setBiometricType] = useState('')
  const [biometricEnabled, setBiometricEnabled] = useState(false)
  const [enableBiometricOption, setEnableBiometricOption] = useState(false)

  useEffect(() => {
    const checkBiometric = async () => {
      try {
        const available = await isBiometricAvailable()
        setBiometricAvailable(available)

        if (available) {
          const type = await getBiometricType()
          setBiometricType(type)

          const enabled = await isBiometricEnabled()
          setBiometricEnabled(enabled)
        }
      } catch (err) {
        logger.error('Error checking biometric:', err)
      }
    }

    checkBiometric()
  }, [])

  const formatError = (raw: string) => {
    if (raw === 'api.errors.network') {
      return tw('api.errors.network', { url: getApiBaseUrl() })
    }
    return resolve(raw)
  }

  const showLoginErrorAlert = (errorMessage: string) => {
    const msg = formatError(errorMessage)
    if (isUserNotFound(msg) || isUserNotFound(errorMessage)) {
      Alert.alert(
        t('auth.login.userNotFoundTitle'),
        t('auth.login.userNotFoundMessage'),
        [{ text: t('common.ok'), style: 'default' }],
      )
    } else if (isWrongPassword(msg) || isWrongPassword(errorMessage)) {
      Alert.alert(
        t('auth.login.wrongPasswordTitle'),
        t('auth.login.wrongPasswordMessage'),
        [{ text: t('common.ok'), style: 'default' }],
      )
    } else if (isConnectionError(msg) || isConnectionError(errorMessage)) {
      Alert.alert(
        t('auth.login.connectionTitle'),
        `${msg}\n\n${t('auth.login.connectionHints')}`,
        [{ text: t('common.ok'), style: 'default' }],
      )
    } else {
      Alert.alert(t('auth.login.loginErrorTitle'), msg, [{ text: t('common.ok'), style: 'default' }])
    }
  }

  const handleLogin = async () => {
    if (!emailOrUsername || !password) {
      setError(t('auth.login.fillAllFields'))
      return
    }

    setLoading(true)
    setError('')

    try {
      await dispatch(login({ emailOrUsername, password })).unwrap()

      if (enableBiometricOption && biometricAvailable) {
        try {
          await enableBiometric(emailOrUsername, password)
          setBiometricEnabled(true)
        } catch (err) {
          logger.error('Error enabling biometric:', err)
        }
      }
    } catch (err: unknown) {
      const errorMessage = getThunkErrorMessage(err, t('auth.login.loginFailed'))
      setError(formatError(errorMessage))
      showLoginErrorAlert(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const handleBiometricLogin = async () => {
    if (!biometricEnabled) {
      Alert.alert(
        t('auth.login.biometricDisabledTitle'),
        t('auth.login.biometricDisabledMessage'),
      )
      return
    }

    const authenticated = await authenticateWithBiometric()
    if (!authenticated) {
      return
    }

    const credentials = await getBiometricCredentials()
    if (!credentials) {
      Alert.alert(t('common.error'), t('auth.login.biometricCredentialsMissing'))
      return
    }

    setLoading(true)
    setError('')

    try {
      await dispatch(login(credentials)).unwrap()
    } catch (err: unknown) {
      const errorMessage = getThunkErrorMessage(err, t('auth.login.loginFailed'))
      setError(formatError(errorMessage))
      showLoginErrorAlert(errorMessage)

      if (isApiError(err) && (err.response?.status === 401 || err.response?.status === 400)) {
        await clearBiometricCredentials()
        setBiometricEnabled(false)
      }
    } finally {
      setLoading(false)
    }
  }

  const displayError = error
  const errorStyle = displayError
    ? isUserNotFound(displayError)
      ? styles.errorWarning
      : isWrongPassword(displayError)
        ? styles.errorInfo
        : styles.errorDanger
    : null

  return (
    <SafeAreaView testID="login-screen" style={styles.safeArea} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        <View style={styles.backgroundDecor}>
          <View style={styles.circle1} />
          <View style={styles.circle2} />
        </View>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <Card style={styles.card} elevation={8 as 0 | 1 | 2 | 3 | 4 | 5}>
            <Card.Content style={styles.cardContent}>
              <View style={styles.logoContainer}>
                <View style={styles.logoCircle}>
                  <MaterialCommunityIcons name="wallet" size={40} color="#6366f1" />
                </View>
              </View>
              <Text variant="headlineMedium" style={styles.title}>
                {t('home.zendaTitle')}
              </Text>
              <Text variant="bodyMedium" style={styles.subtitle}>
                {t('auth.login.subtitle')}
              </Text>

              {displayError ? (
                <View style={[styles.errorContainer, errorStyle]}>
                  <MaterialCommunityIcons
                    name={
                      isUserNotFound(displayError)
                        ? 'account-remove'
                        : isWrongPassword(displayError)
                          ? 'lock-alert'
                          : 'alert-circle'
                    }
                    size={20}
                    color={
                      isUserNotFound(displayError)
                        ? '#f97316'
                        : isWrongPassword(displayError)
                          ? '#eab308'
                          : '#d32f2f'
                    }
                  />
                  <Text style={[styles.error, errorStyle && styles.errorDangerText]}>
                    {displayError}
                  </Text>
                </View>
              ) : null}

              <TextInput
                testID="login-email"
                label={t('auth.login.emailOrUsername')}
                value={emailOrUsername}
                onChangeText={setEmailOrUsername}
                mode="outlined"
                style={styles.input}
                autoCapitalize="none"
                keyboardType="email-address"
              />

              <View style={styles.passwordContainer}>
                <TextInput
                  testID="login-password"
                  label={t('auth.login.password')}
                  value={password}
                  onChangeText={setPassword}
                  mode="outlined"
                  secureTextEntry={!showPassword}
                  style={styles.passwordInput}
                  right={
                    <TextInput.Icon
                      icon={showPassword ? 'eye-off' : 'eye'}
                      onPress={() => setShowPassword(!showPassword)}
                    />
                  }
                />
                <TouchableOpacity
                  style={styles.forgotLink}
                  onPress={() => navigation.navigate('ForgotPassword')}
                  disabled={loading}
                >
                  <Text style={styles.forgotLinkText}>{t('auth.login.forgotPassword')}</Text>
                </TouchableOpacity>
              </View>

              {biometricAvailable && biometricEnabled && (
                <Button
                  mode="outlined"
                  onPress={handleBiometricLogin}
                  loading={loading}
                  disabled={loading}
                  style={styles.biometricButton}
                  icon={() => (
                    <MaterialCommunityIcons
                      name={biometricType === 'Face ID' ? 'face-recognition' : 'fingerprint'}
                      size={24}
                      color="#6366f1"
                    />
                  )}
                >
                  {tw('auth.login.signInWith', { type: biometricType })}
                </Button>
              )}

              <View style={styles.divider}>
                {biometricAvailable && biometricEnabled && (
                  <>
                    <View style={styles.dividerLine} />
                    <Text style={styles.dividerText}>{t('auth.login.or')}</Text>
                    <View style={styles.dividerLine} />
                  </>
                )}
              </View>

              <Button
                testID="login-submit"
                mode="contained"
                onPress={handleLogin}
                loading={loading}
                disabled={loading}
                style={styles.button}
                buttonColor="#6366f1"
                contentStyle={styles.buttonContent}
                labelStyle={styles.buttonLabel}
              >
                {t('auth.login.signIn')}
              </Button>

              {biometricAvailable && (
                <TouchableOpacity
                  style={styles.biometricOption}
                  onPress={() => setEnableBiometricOption(!enableBiometricOption)}
                  disabled={loading}
                >
                  <Checkbox
                    status={enableBiometricOption ? 'checked' : 'unchecked'}
                    onPress={() => setEnableBiometricOption(!enableBiometricOption)}
                    color="#6366f1"
                  />
                  <Text style={styles.biometricOptionText}>
                    {tw('auth.login.enableBiometric', { type: biometricType })}
                  </Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                testID="login-register-link"
                style={styles.registerLink}
                onPress={() => navigation.navigate('Register')}
                disabled={loading}
              >
                <Text style={styles.registerLinkText}>{t('auth.login.noAccount')} </Text>
                <Text style={styles.registerLinkBold}>{t('auth.login.register')}</Text>
              </TouchableOpacity>

              <Text style={styles.note}>{t('auth.login.trialNote')}</Text>
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
    backgroundColor: '#6366f1',
    opacity: 0.06,
    top: -80,
    right: -80,
  },
  circle2: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: '#8b5cf6',
    opacity: 0.06,
    bottom: -60,
    left: -60,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
    zIndex: 1,
  },
  card: {
    borderRadius: 24,
    backgroundColor: '#ffffff',
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 8 as number,
  },
  cardContent: {
    padding: 24,
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
    marginBottom: 32,
    color: '#6b7280',
    lineHeight: 20,
  },
  input: {
    marginBottom: 16,
  },
  passwordContainer: {
    marginBottom: 16,
  },
  passwordInput: {
    flex: 1,
  },
  forgotLink: {
    alignSelf: 'flex-end',
    marginTop: 8,
    paddingVertical: 4,
  },
  forgotLinkText: {
    fontSize: 14,
    color: '#6366f1',
    fontWeight: '500',
  },
  button: {
    marginTop: 8,
    paddingVertical: 4,
  },
  buttonContent: {
    paddingVertical: 4,
  },
  buttonLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  biometricButton: {
    marginBottom: 16,
    paddingVertical: 4,
    borderColor: '#6366f1',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 16,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#e0e0e0',
  },
  dividerText: {
    marginHorizontal: 16,
    color: '#999',
    fontSize: 14,
  },
  biometricOption: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    paddingVertical: 8,
  },
  biometricOptionText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#666',
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 14,
    borderRadius: 12,
    marginBottom: 16,
  },
  errorWarning: {
    backgroundColor: '#fff7ed',
    borderWidth: 1,
    borderColor: '#fdba74',
  },
  errorInfo: {
    backgroundColor: '#fefce8',
    borderWidth: 1,
    borderColor: '#fde047',
  },
  errorDanger: {
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fca5a5',
  },
  error: {
    flex: 1,
    fontSize: 14,
    textAlign: 'left',
  },
  errorDangerText: {
    color: '#d32f2f',
  },
  registerLink: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
    paddingVertical: 8,
  },
  registerLinkText: {
    fontSize: 14,
    color: '#6b7280',
  },
  registerLinkBold: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6366f1',
  },
  note: {
    marginTop: 8,
    textAlign: 'center',
    fontSize: 12,
    color: '#999',
  },
})
