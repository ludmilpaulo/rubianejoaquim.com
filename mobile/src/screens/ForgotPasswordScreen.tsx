import React, { useState } from 'react'
import { View, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native'
import { TextInput, Button, Text, Card } from 'react-native-paper'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { SafeAreaView } from 'react-native-safe-area-context'
import type { StackScreenProps } from '@react-navigation/stack'
import type { AuthStackParamList } from '../navigation/AuthNavigator'
import { authApi } from '../services/api'
import { useI18n } from '../contexts/I18nContext'
import { useActionFeedback } from '../hooks/useActionFeedback'
import { getApiErrorMessage, isApiError } from '../types/api'

type Props = StackScreenProps<AuthStackParamList, 'ForgotPassword'>

export default function ForgotPasswordScreen({ navigation }: Props) {
  const { t } = useI18n()
  const feedback = useActionFeedback()
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = () => {
    const trimmed = email.trim()
    if (!trimmed) {
      setError(t('auth.forgotPassword.emailRequired'))
      return
    }
    setError('')
    void feedback.run(
      async () => {
        await authApi.requestPasswordReset(trimmed)
        setSent(true)
      },
      {
        pendingKey: 'reset',
        pendingMessage: 'feedback.resettingPassword',
        silentError: true,
        onError: (err: unknown) => {
          const msg = getApiErrorMessage(err, 'auth.forgotPassword.sendFailed')
          if (isApiError(err) && err.response?.status === 503) {
            setError(t('auth.forgotPassword.emailUnavailable'))
          } else {
            setError(msg)
          }
        },
      },
    )
  }

  if (sent) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <View style={styles.centered}>
          <Card style={styles.card} elevation={4}>
            <Card.Content style={styles.cardContent}>
              <View style={styles.iconWrap}>
                <MaterialCommunityIcons name="email-check" size={56} color="#10b981" />
              </View>
              <Text variant="titleLarge" style={styles.successTitle}>
                {t('auth.forgotPassword.checkEmailTitle')}
              </Text>
              <Text variant="bodyMedium" style={styles.successText}>
                {t('auth.forgotPassword.successDetail')}
              </Text>
              <Button
                mode="contained"
                onPress={() => navigation.navigate('Login')}
                style={styles.button}
                buttonColor="#6366f1"
              >
                {t('auth.forgotPassword.backToLogin')}
              </Button>
            </Card.Content>
          </Card>
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        <View style={styles.centered}>
          <Card style={styles.card} elevation={4}>
            <Card.Content style={styles.cardContent}>
              <View style={styles.iconWrap}>
                <MaterialCommunityIcons name="lock-reset" size={48} color="#6366f1" />
              </View>
              <Text variant="titleLarge" style={styles.title}>
                {t('auth.forgotPassword.forgotTitle')}
              </Text>
              <Text variant="bodyMedium" style={styles.subtitle}>
                {t('auth.forgotPassword.forgotSubtitle')}
              </Text>

              {error ? (
                <View style={styles.errorContainer}>
                  <MaterialCommunityIcons name="alert-circle" size={20} color="#d32f2f" />
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              ) : null}

              <TextInput
                label={t('auth.forgotPassword.email')}
                value={email}
                onChangeText={(text) => { setEmail(text); setError('') }}
                mode="outlined"
                style={styles.input}
                keyboardType="email-address"
                autoCapitalize="none"
                placeholder={t('auth.forgotPassword.emailPlaceholder')}
              />

              <Button
                mode="contained"
                onPress={handleSubmit}
                {...feedback.buttonProps('reset')}
                style={styles.button}
                buttonColor="#6366f1"
              >
                {feedback.actionLabel('auth.forgotPassword.sendLink', 'reset', 'feedback.resettingPassword')}
              </Button>

              <Button
                mode="text"
                onPress={() => navigation.navigate('Login')}
                disabled={feedback.anyPending}
                style={styles.backLink}
                textColor="#6366f1"
              >
                ← {t('auth.forgotPassword.backToLogin')}
              </Button>
            </Card.Content>
          </Card>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#f8fafc' },
  container: { flex: 1 },
  centered: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    borderRadius: 24,
    backgroundColor: '#ffffff',
    overflow: 'hidden',
  },
  cardContent: { padding: 24 },
  iconWrap: { alignItems: 'center', marginBottom: 16 },
  title: {
    textAlign: 'center',
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 8,
  },
  subtitle: {
    textAlign: 'center',
    color: '#6b7280',
    marginBottom: 24,
  },
  successTitle: {
    textAlign: 'center',
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 12,
  },
  successText: {
    textAlign: 'center',
    color: '#6b7280',
    marginBottom: 24,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fca5a5',
    marginBottom: 16,
  },
  errorText: { flex: 1, color: '#d32f2f', fontSize: 14 },
  input: { marginBottom: 16 },
  button: { marginTop: 8 },
  backLink: { marginTop: 16 },
})
