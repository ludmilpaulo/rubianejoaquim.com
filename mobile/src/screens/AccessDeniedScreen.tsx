import React, { useState, useEffect, useCallback } from 'react'
import { View, StyleSheet, Linking, Alert, ScrollView, Pressable } from 'react-native'
import { Text, Button, Card, TextInput } from 'react-native-paper'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import * as DocumentPicker from 'expo-document-picker'
import { useAppDispatch, useAppSelector } from '../hooks/redux'
import { checkPaidAccess } from '../store/authSlice'
import { accessApi, referralApi } from '../services/api'
import {
  isIapSupported,
  purchaseIapProduct,
  getIapProducts,
  PRIVACY_POLICY_URL,
  TERMS_OF_USE_URL,
  SUBSCRIPTION_PRODUCT_ID,
  type IapListedProduct,
} from '../services/iap'
import type { MobileAppSubscription, SubscriptionPaymentInfo } from '../types'
import { useI18n } from '../contexts/I18nContext'
import { useCurrency } from '../contexts/CurrencyContext'
import { useAlert } from '../hooks/useAlert'
import { useActionFeedback } from '../hooks/useActionFeedback'
import { ZendaLoading } from '../components/ui/ZendaLoader'
import { getApiErrorMessage, isApiError, type UploadFilePayload } from '../types/api'
import { logger } from '../utils/logger'

export default function AccessDeniedScreen() {
  const { t, tw } = useI18n()
  const { formatOriginal } = useCurrency()
  const alert = useAlert()
  const feedback = useActionFeedback()
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
  const [iapPurchasing, setIapPurchasing] = useState(false)
  const [iapProduct, setIapProduct] = useState<IapListedProduct | null>(null)

  useEffect(() => {
    if (!isIapSupported()) return
    getIapProducts([SUBSCRIPTION_PRODUCT_ID])
      .then((products) => {
        const match = products.find((p) => p.id === SUBSCRIPTION_PRODUCT_ID)
        if (match) setIapProduct(match)
      })
      .catch((error) => logger.warn('IAP product prefetch failed:', error))
  }, [])

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
        logger.error('Error checking access:', error)
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
        referralApi.getPointsBalance().catch(() => ({ balance: 0, balance_kz: 0 })),
      ])
      setSubscription(subRes?.subscription != null ? subRes.subscription : null)
      setPaymentInfo(payRes ?? null)
      if (pointsRes?.balance !== undefined) {
        setPointsBalance(pointsRes.balance)
      }
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
        alert.error(t('access.linkError'))
      }
    } catch {
      alert.error(t('access.linkError'))
    }
  }

  const handlePickAndUploadProof = async () => {
    if (!subscription?.id || feedback.isPending('uploadProof')) return
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['image/*', 'application/pdf'],
        copyToCacheDirectory: true,
      })
      if (result.canceled) return
      const file = result.assets[0]
      setUploading(true)
      await feedback.run(
        async () => {
          const filePayload = {
            uri: file.uri,
            name: file.name ?? `proof_${Date.now()}.jpg`,
            type: file.mimeType ?? 'image/jpeg',
          }
          await accessApi.uploadSubscriptionPaymentProof(subscription.id, filePayload as UploadFilePayload, uploadNotes || undefined)
          setUploadNotes('')
          await loadSubscription()
          dispatch(checkPaidAccess())
        },
        {
          pendingKey: 'uploadProof',
          pendingMessage: 'feedback.uploading',
          successMessage: 'profile.proofSentTitle',
          errorFallback: 'profile.uploadFailed',
        },
      )
    } finally {
      setUploading(false)
    }
  }

  const monthlyPriceKz = paymentInfo?.monthly_price_kz ?? 10000
  const pointsForSubscription = monthlyPriceKz / 1000

  const handleRedeemSubscriptionWithPoints = async () => {
    if (pointsBalance < pointsForSubscription) {
      alert.info(
        t('profile.insufficientPoints'),
        tw('access.insufficientPointsMsg', { points: pointsForSubscription }),
      )
      return
    }
    Alert.alert(
      t('profile.redeemConfirmTitle'),
      tw('access.redeemConfirm', { points: pointsForSubscription }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('access.yesUsePoints'),
          onPress: async () => {
            setRedeemingSubscription(true)
            await feedback.run(
              async () => {
                await referralApi.redeemSubscription()
                await loadSubscription()
                dispatch(checkPaidAccess())
              },
              {
                pendingKey: 'redeemSub',
                pendingMessage: 'feedback.processingSubscription',
                successMessage: 'profile.redeemSuccess',
                errorFallback: 'profile.redeemFailed',
              },
            )
            setRedeemingSubscription(false)
          },
        },
      ]
    )
  }

  const handleStartFreeTrial = async () => {
    setSubscribing(true)
    await feedback.run(
      async () => {
        await accessApi.subscribeToMobileApp()
        const { hasAccess } = await dispatch(checkPaidAccess()).unwrap()
        if (hasAccess) {
          alert.success(t('profile.trialStartedMsg'), t('profile.trialStartedTitle'))
        } else {
          alert.info(t('common.error'), t('profile.accessPending'))
        }
      },
      {
        pendingKey: 'subscribe',
        pendingMessage: 'feedback.processingSubscription',
        silentError: true,
        onError: async (error: unknown) => {
          if (isApiError(error) && error.response?.data?.code === 'trial_already_used') {
            await loadSubscription()
            alert.info(t('access.trialUsedTitle'), t('access.trialUsedMsg'))
            return
          }
          logger.warn('Subscribe error:', isApiError(error) ? error.response?.status : error)
          alert.error(getApiErrorMessage(error, 'access.trialFailed'))
        },
      },
    )
    setSubscribing(false)
  }

  const handleOpenUrl = async (url: string) => {
    try {
      const supported = await Linking.canOpenURL(url)
      if (supported) {
        await Linking.openURL(url)
      } else {
        alert.error(t('access.linkError'))
      }
    } catch {
      alert.error(t('access.linkError'))
    }
  }

  const subscriptionPriceLabel = iapProduct?.displayPrice
    ? tw('access.iapSubscriptionPrice', { price: iapProduct.displayPrice })
    : t('access.iapSubscriptionPriceFallback')

  const handleSubscribeWithApple = async () => {
    if (!isIapSupported()) {
      alert.info(t('common.error'), t('access.iapUnavailable'))
      return
    }
    setIapPurchasing(true)
    await feedback.run(
      async () => {
        await purchaseIapProduct(SUBSCRIPTION_PRODUCT_ID)
        const { hasAccess } = await dispatch(checkPaidAccess()).unwrap()
        if (hasAccess) {
          alert.success(t('access.iapSuccess'))
        } else {
          alert.info(t('common.error'), t('profile.accessPending'))
        }
      },
      {
        pendingKey: 'iapSubscribe',
        pendingMessage: 'feedback.processingSubscription',
        silentError: true,
        onError: (error: unknown) => {
          const message = error instanceof Error ? error.message : t('access.iapFailed')
          if (message !== 'Purchase cancelled') {
            alert.error(message)
          }
        },
      },
    )
    setIapPurchasing(false)
  }

  if (subLoading) {
    return (
      <View style={styles.scroll}>
        <ZendaLoading visible fill message={t('loading.subscription')} />
      </View>
    )
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
                color="#3534C9"
              />
            </View>
          </View>
          <Text variant="headlineMedium" style={styles.title}>
            {t('access.title')}
          </Text>
          <Text variant="bodyLarge" style={styles.message}>
            {t('access.message')}
          </Text>
          <Text variant="bodyMedium" style={styles.submessage}>
            {t('access.submessage')}
          </Text>
          {!subLoading && !subscription && (
            <View style={styles.termsBlock}>
              <Text variant="labelMedium" style={styles.termsTitle}>{t('access.termsTitle')}</Text>
              <Text variant="bodySmall" style={styles.termsText}>{t('access.termsText')}</Text>
            </View>
          )}
          {!subLoading && !subscription && (
            <Text variant="bodyMedium" style={styles.ctaHint}>{t('access.ctaHint')}</Text>
          )}

          {/* Trial already expired: show pay + upload */}
          {!subLoading && subscription && (subscription.status === 'expired' || subscription.status === 'cancelled') && (
            <View style={styles.expiredBlock}>
              <View style={styles.expiredBanner}>
                <MaterialCommunityIcons name="alert-circle-outline" size={24} color="#b91c1c" />
                <Text variant="titleMedium" style={styles.expiredTitle}>
                  {t('access.trialUsedTitle')}
                </Text>
              </View>
              <Text variant="bodyMedium" style={styles.expiredMessage}>
                {t('access.trialUsedMsg')}
              </Text>
              {paymentInfo && (
                <View style={styles.paymentDetails}>
                  <Text variant="labelLarge" style={styles.paymentDetailsTitle}>{t('access.paymentDetails')}</Text>
                  <View style={styles.paymentRow}>
                    <Text variant="bodySmall" style={styles.paymentLabel}>{t('access.amount')}</Text>
                    <Text variant="bodyLarge" style={styles.paymentValue}>
                      {formatOriginal(
                        paymentInfo.monthly_price_kz,
                        paymentInfo.currency || 'AOA',
                      )}
                      {t('access.perMonth')}
                    </Text>
                  </View>
                  <View style={styles.paymentRow}>
                    <Text variant="bodySmall" style={styles.paymentLabel}>IBAN</Text>
                    <Text variant="bodyMedium" style={styles.paymentValue} selectable>
                      {paymentInfo.iban}
                    </Text>
                  </View>
                  <View style={styles.paymentRow}>
                    <Text variant="bodySmall" style={styles.paymentLabel}>{t('access.beneficiary')}</Text>
                    <Text variant="bodyMedium" style={styles.paymentValue} selectable>
                      {paymentInfo.payee_name}
                    </Text>
                  </View>
                </View>
              )}
              {pointsBalance >= pointsForSubscription && (
                <Button
                  mode="contained"
                  onPress={handleRedeemSubscriptionWithPoints}
                  loading={redeemingSubscription || feedback.isPending('redeemSub')}
                  disabled={redeemingSubscription || feedback.isPending('redeemSub')}
                  style={styles.pointsButton}
                  buttonColor="#E67E22"
                  contentStyle={styles.buttonContent}
                  labelStyle={styles.buttonLabel}
                  icon={() => <MaterialCommunityIcons name="star" size={22} color="#fff" />}
                >
                  {(redeemingSubscription || feedback.isPending('redeemSub'))
                    ? t('feedback.processingSubscription')
                    : tw('access.redeemPoints', { points: pointsForSubscription })}
                </Button>
              )}
              <Text variant="bodySmall" style={styles.payOrPointsHint}>
                {pointsBalance >= pointsForSubscription
                  ? t('access.payOrPoints')
                  : t('access.payOnly')}
              </Text>
              <TextInput
                mode="outlined"
                label={t('access.notesOptional')}
                placeholder={t('access.notesPlaceholder')}
                value={uploadNotes}
                onChangeText={setUploadNotes}
                style={styles.notesInput}
                outlineColor="#e0e7ff"
                activeOutlineColor="#3534C9"
              />
              <Button
                mode="contained"
                onPress={handlePickAndUploadProof}
                loading={uploading || feedback.isPending('uploadProof')}
                disabled={uploading || feedback.isPending('uploadProof')}
                style={styles.uploadButton}
                buttonColor="#3534C9"
                contentStyle={styles.buttonContent}
                labelStyle={styles.buttonLabel}
                icon={() => <MaterialCommunityIcons name="upload" size={22} color="#fff" />}
              >
                {(uploading || feedback.isPending('uploadProof'))
                  ? t('feedback.uploading')
                  : t('access.uploadProof')}
              </Button>
              <Text variant="bodySmall" style={styles.uploadHint}>
                {t('access.proofHint')}
              </Text>
            </View>
          )}

          <View style={styles.buttonContainer}>
            {isIapSupported() && (
              <>
                <View style={styles.iapDisclosure}>
                  <Text variant="labelLarge" style={styles.iapDisclosureTitle}>
                    {iapProduct?.title || t('access.iapSubscriptionTitle')}
                  </Text>
                  <Text variant="bodySmall" style={styles.iapDisclosureText}>
                    {t('access.iapSubscriptionLength')}
                  </Text>
                  <Text variant="bodySmall" style={styles.iapDisclosureText}>
                    {subscriptionPriceLabel}
                  </Text>
                  <Text variant="bodySmall" style={styles.iapDisclosureLegal}>
                    {t('access.iapSubscriptionLegal')}
                  </Text>
                  <View style={styles.iapLinksRow}>
                    <Pressable onPress={() => handleOpenUrl(PRIVACY_POLICY_URL)}>
                      <Text variant="bodySmall" style={styles.iapLink}>
                        {t('access.iapPrivacyPolicy')}
                      </Text>
                    </Pressable>
                    <Text variant="bodySmall" style={styles.iapLinkSeparator}> · </Text>
                    <Pressable onPress={() => handleOpenUrl(TERMS_OF_USE_URL)}>
                      <Text variant="bodySmall" style={styles.iapLink}>
                        {t('access.iapTermsOfUse')}
                      </Text>
                    </Pressable>
                  </View>
                </View>
                <Button
                  mode="contained"
                  onPress={handleSubscribeWithApple}
                  loading={iapPurchasing || feedback.isPending('iapSubscribe')}
                  disabled={iapPurchasing || feedback.isPending('iapSubscribe') || subscribing || feedback.isPending('subscribe')}
                  style={styles.primaryButton}
                  buttonColor="#000"
                  contentStyle={styles.buttonContent}
                  labelStyle={styles.buttonLabel}
                  icon={(iapPurchasing || feedback.isPending('iapSubscribe')) ? undefined : () => <MaterialCommunityIcons name="apple" size={22} color="#fff" />}
                >
                  {(iapPurchasing || feedback.isPending('iapSubscribe'))
                    ? t('feedback.processingSubscription')
                    : t('access.subscribeWithApple')}
                </Button>
                <Text variant="bodySmall" style={styles.buttonHint}>
                  {subscription?.status === 'expired' || subscription?.status === 'cancelled'
                    ? t('access.iapRenewHint')
                    : t('access.iapOrTrial')}
                </Text>
              </>
            )}
            {!subLoading && !subscription && (
              <>
                <Button
                  mode="contained"
                  onPress={handleStartFreeTrial}
                  loading={subscribing || feedback.isPending('subscribe')}
                  disabled={subscribing || feedback.isPending('subscribe') || iapPurchasing || feedback.isPending('iapSubscribe')}
                  style={styles.primaryButton}
                  buttonColor="#3534C9"
                  contentStyle={styles.buttonContent}
                  labelStyle={styles.buttonLabel}
                  icon={(subscribing || feedback.isPending('subscribe')) ? undefined : () => <MaterialCommunityIcons name="gift-outline" size={22} color="#fff" />}
                >
                  {(subscribing || feedback.isPending('subscribe'))
                    ? t('feedback.processingSubscription')
                    : t('access.startTrial')}
                </Button>
                <Text variant="bodySmall" style={styles.buttonHint}>
                  {t('access.trialButtonHint')}
                </Text>
              </>
            )}
            <Button
              mode="outlined"
              onPress={handleOpenCourses}
              style={styles.secondaryButton}
              contentStyle={styles.buttonContent}
              labelStyle={styles.secondaryButtonLabel}
              icon={() => <MaterialCommunityIcons name="book-open-variant" size={20} color="#3534C9" />}
            >
              {t('access.browseCourses')}
            </Button>
            <Button
              mode="text"
              onPress={handleCheckAgain}
              style={styles.tertiaryButton}
              contentStyle={styles.buttonContent}
              labelStyle={styles.tertiaryButtonLabel}
              icon={() => <MaterialCommunityIcons name="refresh" size={20} color="#3534C9" />}
            >
              {t('access.verifyAgain')}
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
    backgroundColor: '#3534C9',
    opacity: 0.05,
    top: -100,
    right: -100,
  },
  circle2: {
    position: 'absolute',
    width: 250,
    height: 250,
    borderRadius: 125,
    backgroundColor: '#3C3BD4',
    opacity: 0.05,
    bottom: -80,
    left: -80,
  },
  card: {
    width: '100%',
    maxWidth: 420,
    borderRadius: 24,
    backgroundColor: '#ffffff',
    shadowColor: '#3534C9',
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
  iapDisclosure: {
    width: '100%',
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 14,
    marginBottom: 4,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  iapDisclosureTitle: {
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 6,
  },
  iapDisclosureText: {
    color: '#4b5563',
    lineHeight: 20,
    marginBottom: 4,
  },
  iapDisclosureLegal: {
    color: '#64748b',
    lineHeight: 20,
    marginTop: 6,
    marginBottom: 8,
  },
  iapLinksRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
  },
  iapLink: {
    color: '#3534C9',
    textDecorationLine: 'underline',
    fontWeight: '600',
  },
  iapLinkSeparator: {
    color: '#94a3b8',
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
    shadowColor: '#3534C9',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  secondaryButton: {
    borderRadius: 12,
    borderColor: '#3534C9',
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
    color: '#3534C9',
  },
  tertiaryButton: {
    marginTop: 8,
  },
  tertiaryButtonLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#3534C9',
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
