import React, { useState, useEffect, useCallback } from 'react'
import { View, StyleSheet, Linking, Alert, ScrollView } from 'react-native'
import { Text, Button, Card, TextInput } from 'react-native-paper'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import * as DocumentPicker from 'expo-document-picker'
import { useAppDispatch, useAppSelector } from '../hooks/redux'
import { checkPaidAccess } from '../store/authSlice'
import { accessApi, referralApi } from '../services/api'
import type { MobileAppSubscription, SubscriptionPaymentInfo } from '../types'

export default function AccessDeniedScreen() {
  const dispatch = useAppDispatch()
  const { user, hasPaidAccess } = useAppSelector((state) => state.auth)
  const [subscribing, setSubscribing] = useState(false)
  const [subscription, setSubscription] = useState<MobileAppSubscription | null>(null)
  const [paymentInfo, setPaymentInfo] = useState<SubscriptionPaymentInfo | null>(null)
  const [subLoading, setSubLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [uploadNotes, setUploadNotes] = useState('')
  const [pointsBalance, setPointsBalance] = useState<number>(0)
  const [redeemingSubscription, setRedeemingSubscription] = useState(false)

  // Auto-check access when screen loads - if user has access (course, subscription trial/active, or mentorship), they shouldn't be here
  useEffect(() => {
    if (!user) {
      return
    }
    
    // If hasPaidAccess is already true, user shouldn't be on this screen
    // This can happen if state updates after navigation - App.tsx will handle redirect
    if (hasPaidAccess) {
      return
    }

    // Always check access when screen loads to ensure we have latest status
    // This handles cases where user has course/subscription/trial but checkAuth didn't catch it initially
    const checkAccess = async () => {
      try {
        const { hasAccess } = await dispatch(checkPaidAccess()).unwrap()
        // If access is found, the state update (hasPaidAccess) will trigger navigation in App.tsx
        // App.tsx will switch to MainNavigator when hasPaidAccess becomes true
      } catch (error) {
        console.error('Error checking access:', error)
      }
    }
    
    // Small delay to ensure screen is mounted and state is ready
    const timer = setTimeout(() => {
      checkAccess()
    }, 100)
    
    return () => clearTimeout(timer)
  }, [user, dispatch]) // Removed hasPaidAccess from deps to avoid loops

  const loadSubscription = useCallback(async () => {
    if (!user) {
      setSubLoading(false)
      return
    }
    try {
      setSubLoading(true)
      const [subRes, payRes, pointsRes] = await Promise.all([
        accessApi.getMobileSubscription().catch(() => null),
        accessApi.getSubscriptionPaymentInfo().catch(() => null),
        referralApi.getPointsBalance().catch(() => ({ balance: 0 })),
      ])
      setSubscription(subRes?.subscription != null ? subRes.subscription : null)
      setPaymentInfo(payRes ?? null)
      if (pointsRes?.balance !== undefined) setPointsBalance(pointsRes.balance)
    } catch {
      setSubscription(null)
      setPaymentInfo(null)
    } finally {
      setSubLoading(false)
    }
  }, [user])

  useEffect(() => {
    loadSubscription()
  }, [loadSubscription])

  const handleCheckAgain = () => {
    dispatch(checkPaidAccess())
  }

  const handleOpenCourses = async () => {
    const url = 'https://www.rubianejoaquim.com/cursos'
    try {
      const supported = await Linking.canOpenURL(url)
      if (supported) {
        await Linking.openURL(url)
      } else {
        Alert.alert('Erro', 'Não foi possível abrir o link.')
      }
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível abrir o link.')
    }
  }

  const handlePickAndUploadProof = async () => {
    if (!subscription?.id) return
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['image/*', 'application/pdf'],
        copyToCacheDirectory: true,
      })
      if (result.canceled) return
      const file = result.assets[0]
      setUploading(true)
      const filePayload = {
        uri: file.uri,
        name: file.name ?? `proof_${Date.now()}.jpg`,
        type: file.mimeType ?? 'image/jpeg',
      }
      await accessApi.uploadSubscriptionPaymentProof(subscription.id, filePayload as any, uploadNotes || undefined)
      setUploadNotes('')
      Alert.alert(
        'Comprovativo enviado',
        'O seu comprovativo foi recebido. A subscrição será ativada após validação pela nossa equipa. Toque em "Verificar novamente" após a ativação.'
      )
      await loadSubscription()
      dispatch(checkPaidAccess())
    } catch (error: any) {
      const msg = error?.response?.data?.detail ?? error?.response?.data?.error ?? error?.message ?? 'Não foi possível enviar o ficheiro.'
      Alert.alert('Erro', msg)
    } finally {
      setUploading(false)
    }
  }

  const POINTS_FOR_SUBSCRIPTION = 10

  const handleRedeemSubscriptionWithPoints = async () => {
    if (pointsBalance < POINTS_FOR_SUBSCRIPTION) {
      Alert.alert(
        'Pontos insuficientes',
        `Precisa de ${POINTS_FOR_SUBSCRIPTION} pontos para ativar a subscrição (10.000 KZ). Tem ${pointsBalance.toFixed(1)} pontos. Compartilhe cursos para ganhar mais!`
      )
      return
    }
    Alert.alert(
      'Usar pontos para subscrição',
      `Deseja usar ${POINTS_FOR_SUBSCRIPTION} pontos (10.000 KZ) para ativar a subscrição mensal?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Sim, usar pontos',
          onPress: async () => {
            setRedeemingSubscription(true)
            try {
              await referralApi.redeemSubscription()
              Alert.alert('Sucesso', 'Subscrição ativada com pontos!')
              await loadSubscription()
              dispatch(checkPaidAccess())
            } catch (err: any) {
              const msg =
                err?.response?.data?.error ??
                err?.response?.data?.detail ??
                err?.message ??
                'Não foi possível ativar.'
              Alert.alert('Erro', msg)
            } finally {
              setRedeemingSubscription(false)
            }
          },
        },
      ]
    )
  }

  const handleStartFreeTrial = async () => {
    setSubscribing(true)
    try {
      await accessApi.subscribeToMobileApp()
      const { hasAccess } = await dispatch(checkPaidAccess()).unwrap()
      if (hasAccess) {
        Alert.alert(
          'Semana grátis ativada',
          'Tem 7 dias de acesso gratuito ao app. Após esse período, pode subscrever por 10.000 AOA/mês e enviar o comprovativo de pagamento para continuar a usar o Zenda.'
        )
      } else {
        Alert.alert('Aviso', 'Subscrição criada, mas o acesso ainda não foi atualizado. Toque em "Verificar novamente".')
      }
    } catch (error: any) {
      if (error?.response?.data?.code === 'trial_already_used') {
        await loadSubscription()
        Alert.alert(
          'Período de teste terminado',
          'O seu período de teste já terminou e só pode ser utilizado uma vez. Para continuar a usar o Zenda, efetue o pagamento da subscrição mensal (veja os dados abaixo) e envie o comprovativo de pagamento.',
          [{ text: 'OK' }]
        )
        return
      }
      const msg =
        error?.response?.data?.detail ||
        (typeof error?.response?.data?.error === 'string' ? error.response.data.error : null) ||
        error?.message ||
        'Não foi possível ativar a semana grátis. Verifique a ligação e tente novamente.'
      if (__DEV__) {
        console.warn('Subscribe error:', error?.response?.status, error?.response?.data, msg)
      }
      Alert.alert('Erro', msg)
    } finally {
      setSubscribing(false)
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.scrollContent} style={styles.scroll}>
      <View style={styles.backgroundDecor}>
        <View style={styles.circle1} />
        <View style={styles.circle2} />
      </View>
      <Card style={styles.card}>
        <Card.Content style={styles.content}>
          <View style={styles.iconContainer}>
            <View style={styles.iconBackground}>
              <MaterialCommunityIcons
                name="lock-outline"
                size={56}
                color="#6366f1"
              />
            </View>
          </View>
          <Text variant="headlineMedium" style={styles.title}>
            Acesso ao Zenda
          </Text>
          <Text variant="bodyLarge" style={styles.message}>
            Para usar o app, precisa de estar inscrito num curso, ter mentoria aprovada ou ter subscrição do app.
          </Text>
          <Text variant="bodyMedium" style={styles.submessage}>
            Não tem curso? Comece com <Text style={styles.bold}>1 semana grátis</Text>, depois subscreva por <Text style={styles.bold}>10.000 AOA/mês</Text>. O pagamento é ativado após envio do comprovativo.
          </Text>
          {!subLoading && !subscription && (
            <View style={styles.termsBlock}>
              <Text variant="labelMedium" style={styles.termsTitle}>Termos da oferta de teste</Text>
              <Text variant="bodySmall" style={styles.termsText}>
                • O período de teste dura 7 dias e termina 7 dias após a ativação.{'\n'}
                • Após o período de teste, a subscrição custa 10.000 AOA/mês.{'\n'}
                • Pode cancelar a qualquer momento durante o teste: simplesmente não efetue o pagamento. Não será cobrado automaticamente.{'\n'}
                • Para subscrever após o teste, efetue o pagamento e envie o comprovativo na app.
              </Text>
            </View>
          )}
          {!subLoading && !subscription && (
            <Text variant="bodyMedium" style={styles.ctaHint}>
              Toque no botão abaixo para ativar a sua semana grátis e começar a usar o Zenda.
            </Text>
          )}

          {/* Trial already expired: show pay + upload */}
          {!subLoading && subscription && (subscription.status === 'expired' || subscription.status === 'cancelled') && (
            <View style={styles.expiredBlock}>
              <View style={styles.expiredBanner}>
                <MaterialCommunityIcons name="alert-circle-outline" size={24} color="#b91c1c" />
                <Text variant="titleMedium" style={styles.expiredTitle}>
                  Período de teste terminado
                </Text>
              </View>
              <Text variant="bodyMedium" style={styles.expiredMessage}>
                O seu período de teste já terminou e só pode ser utilizado uma vez. Para continuar a usar o Zenda, efetue o pagamento da subscrição mensal e envie o comprovativo abaixo.
              </Text>
              {paymentInfo && (
                <View style={styles.paymentDetails}>
                  <Text variant="labelLarge" style={styles.paymentDetailsTitle}>Dados para pagamento</Text>
                  <View style={styles.paymentRow}>
                    <Text variant="bodySmall" style={styles.paymentLabel}>Valor</Text>
                    <Text variant="bodyLarge" style={styles.paymentValue}>
                      {paymentInfo.monthly_price_kz.toLocaleString('pt-AO')} AOA/mês
                    </Text>
                  </View>
                  <View style={styles.paymentRow}>
                    <Text variant="bodySmall" style={styles.paymentLabel}>IBAN</Text>
                    <Text variant="bodyMedium" style={styles.paymentValue} selectable>
                      {paymentInfo.iban}
                    </Text>
                  </View>
                  <View style={styles.paymentRow}>
                    <Text variant="bodySmall" style={styles.paymentLabel}>Beneficiário</Text>
                    <Text variant="bodyMedium" style={styles.paymentValue} selectable>
                      {paymentInfo.payee_name}
                    </Text>
                  </View>
                </View>
              )}
              {pointsBalance >= POINTS_FOR_SUBSCRIPTION && (
                <Button
                  mode="contained"
                  onPress={handleRedeemSubscriptionWithPoints}
                  loading={redeemingSubscription}
                  disabled={redeemingSubscription}
                  style={styles.pointsButton}
                  buttonColor="#f59e0b"
                  contentStyle={styles.buttonContent}
                  labelStyle={styles.buttonLabel}
                  icon={() => <MaterialCommunityIcons name="star" size={22} color="#fff" />}
                >
                  {redeemingSubscription ? 'A ativar...' : `Usar pontos para subscrição (${POINTS_FOR_SUBSCRIPTION} pts)`}
                </Button>
              )}
              <Text variant="bodySmall" style={styles.payOrPointsHint}>
                {pointsBalance >= POINTS_FOR_SUBSCRIPTION
                  ? 'Ou pague por transferência e envie o comprovativo abaixo:'
                  : 'Efetue o pagamento e envie o comprovativo abaixo:'}
              </Text>
              <TextInput
                mode="outlined"
                label="Notas (opcional)"
                placeholder="Ex: Referência do transferência"
                value={uploadNotes}
                onChangeText={setUploadNotes}
                style={styles.notesInput}
                outlineColor="#e0e7ff"
                activeOutlineColor="#6366f1"
              />
              <Button
                mode="contained"
                onPress={handlePickAndUploadProof}
                loading={uploading}
                disabled={uploading}
                style={styles.uploadButton}
                buttonColor="#6366f1"
                contentStyle={styles.buttonContent}
                labelStyle={styles.buttonLabel}
                icon={() => <MaterialCommunityIcons name="upload" size={22} color="#fff" />}
              >
                {uploading ? 'A enviar...' : 'Enviar comprovativo de pagamento'}
              </Button>
              <Text variant="bodySmall" style={styles.uploadHint}>
                Fotografia ou PDF do comprovativo de transferência
              </Text>
            </View>
          )}

          <View style={styles.buttonContainer}>
            {!subLoading && !subscription && (
              <>
                <Button
                  mode="contained"
                  onPress={handleStartFreeTrial}
                  loading={subscribing}
                  disabled={subscribing}
                  style={styles.primaryButton}
                  buttonColor="#6366f1"
                  contentStyle={styles.buttonContent}
                  labelStyle={styles.buttonLabel}
                  icon={subscribing ? undefined : () => <MaterialCommunityIcons name="gift-outline" size={22} color="#fff" />}
                >
                  {subscribing ? 'A ativar...' : 'Começar a minha semana grátis'}
                </Button>
                <Text variant="bodySmall" style={styles.buttonHint}>
                  Toque para ativar o acesso ao app
                </Text>
              </>
            )}
            <Button
              mode="outlined"
              onPress={handleOpenCourses}
              style={styles.secondaryButton}
              contentStyle={styles.buttonContent}
              labelStyle={styles.secondaryButtonLabel}
              icon={() => <MaterialCommunityIcons name="book-open-variant" size={20} color="#6366f1" />}
            >
              Ver Cursos e Inscrever-se
            </Button>
            <Button
              mode="text"
              onPress={handleCheckAgain}
              style={styles.tertiaryButton}
              contentStyle={styles.buttonContent}
              labelStyle={styles.tertiaryButtonLabel}
              icon={() => <MaterialCommunityIcons name="refresh" size={20} color="#6366f1" />}
            >
              Verificar novamente
            </Button>
          </View>
        </Card.Content>
      </Card>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    paddingVertical: 40,
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    padding: 20,
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
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: '#6366f1',
    opacity: 0.05,
    top: -100,
    right: -100,
  },
  circle2: {
    position: 'absolute',
    width: 250,
    height: 250,
    borderRadius: 125,
    backgroundColor: '#8b5cf6',
    opacity: 0.05,
    bottom: -80,
    left: -80,
  },
  card: {
    width: '100%',
    maxWidth: 420,
    borderRadius: 24,
    backgroundColor: '#ffffff',
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 8,
    zIndex: 1,
  },
  content: {
    alignItems: 'center',
    padding: 32,
  },
  iconContainer: {
    marginBottom: 24,
  },
  iconBackground: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#f0f4ff',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#e0e7ff',
  },
  title: {
    marginBottom: 16,
    textAlign: 'center',
    fontWeight: '700',
    color: '#1f2937',
    letterSpacing: -0.5,
  },
  message: {
    marginBottom: 12,
    textAlign: 'center',
    color: '#4b5563',
    lineHeight: 24,
  },
  submessage: {
    marginBottom: 32,
    textAlign: 'center',
    color: '#6b7280',
    lineHeight: 20,
  },
  termsBlock: {
    width: '100%',
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  termsTitle: {
    fontWeight: '600',
    color: '#475569',
    marginBottom: 8,
  },
  termsText: {
    color: '#64748b',
    lineHeight: 20,
  },
  ctaHint: {
    marginBottom: 20,
    textAlign: 'center',
    color: '#6b7280',
    lineHeight: 20,
  },
  bold: {
    fontWeight: '700',
    color: '#374151',
  },
  buttonContainer: {
    width: '100%',
    gap: 12,
  },
  buttonHint: {
    marginTop: 6,
    textAlign: 'center',
    color: '#9ca3af',
    fontSize: 13,
  },
  primaryButton: {
    borderRadius: 12,
    elevation: 3,
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  secondaryButton: {
    borderRadius: 12,
    borderColor: '#6366f1',
    borderWidth: 1.5,
    marginTop: 12,
  },
  buttonContent: {
    paddingVertical: 8,
    height: 52,
  },
  buttonLabel: {
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  secondaryButtonLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#6366f1',
  },
  tertiaryButton: {
    marginTop: 8,
  },
  tertiaryButtonLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6366f1',
  },
  expiredBlock: {
    width: '100%',
    marginBottom: 24,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  expiredBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  expiredTitle: {
    fontWeight: '700',
    color: '#b91c1c',
  },
  expiredMessage: {
    color: '#4b5563',
    lineHeight: 22,
    marginBottom: 16,
  },
  paymentDetails: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  paymentDetailsTitle: {
    fontWeight: '600',
    color: '#475569',
    marginBottom: 10,
    fontSize: 13,
  },
  paymentRow: {
    marginBottom: 8,
  },
  paymentLabel: {
    color: '#64748b',
    marginBottom: 2,
    fontSize: 12,
  },
  paymentValue: {
    color: '#1e293b',
    fontWeight: '500',
  },
  notesInput: {
    backgroundColor: '#fff',
    marginBottom: 12,
  },
  pointsButton: {
    marginBottom: 16,
    borderRadius: 12,
    elevation: 2,
  },
  payOrPointsHint: {
    marginBottom: 12,
    textAlign: 'center',
    color: '#6b7280',
    fontStyle: 'italic',
  },
  uploadButton: {
    borderRadius: 12,
    elevation: 2,
    marginBottom: 8,
  },
  uploadHint: {
    color: '#9ca3af',
    textAlign: 'center',
    fontSize: 12,
  },
})
