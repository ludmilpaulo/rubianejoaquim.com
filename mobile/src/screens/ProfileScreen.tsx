import React, { useState, useEffect, useCallback, useRef } from 'react'
import { View, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native'
import { Text, Card, Button, Divider, TextInput } from 'react-native-paper'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { SafeAreaView } from 'react-native-safe-area-context'
import * as DocumentPicker from 'expo-document-picker'
import { useAppDispatch, useAppSelector } from '../hooks/redux'
import { logout, checkPaidAccess } from '../store/authSlice'
import { useNavigation } from '@react-navigation/native'
import { authApi, accessApi, referralApi } from '../services/api'
import { shareZendaApp } from '../utils/shareZenda'
import type { MobileAppSubscription, SubscriptionPaymentInfo } from '../types'
import { getApiErrorMessage, type UploadFilePayload } from '../types/api'
import { useI18n } from '../contexts/I18nContext'
import { useCurrency } from '../contexts/CurrencyContext'
import { useAlert } from '../hooks/useAlert'
import { useActionFeedback } from '../hooks/useActionFeedback'
import { ZendaLoader } from '../components/ui/ZendaLoader'
import { colors } from '../theme'

export default function ProfileScreen() {
  const { t, tw, locale } = useI18n()
  const { formatOriginal } = useCurrency()
  const dateLoc =
    locale === 'pt' ? 'pt-AO' : locale === 'fr' ? 'fr-FR' : locale === 'es' ? 'es-ES' : 'en-US'
  const alert = useAlert()
  const { run, isPending, buttonProps, actionLabel } = useActionFeedback()
  const dispatch = useAppDispatch()
  const { user, hasExpiredSubscription } = useAppSelector((state) => state.auth)
  const hasShownExpiryAlert = useRef(false)
  const navigation = useNavigation<any>()
  const [subscription, setSubscription] = useState<MobileAppSubscription | null>(null)
  const [paymentInfo, setPaymentInfo] = useState<SubscriptionPaymentInfo | null>(null)
  const [subLoading, setSubLoading] = useState(true)
  const [uploadNotes, setUploadNotes] = useState('')
  const [pointsBalance, setPointsBalance] = useState<number>(0)
  const [pointsBalanceKz, setPointsBalanceKz] = useState<number>(0)

  const loadSubscription = useCallback(async () => {
    try {
      setSubLoading(true)
      const [subRes, payRes, pointsRes] = await Promise.all([
        accessApi.getMobileSubscription().catch(() => null),
        accessApi.getSubscriptionPaymentInfo().catch(() => null),
        referralApi.getPointsBalance().catch(() => ({ balance: 0, balance_kz: 0 })),
      ])
      setSubscription(subRes?.subscription ?? subRes ?? null)
      setPaymentInfo(payRes ?? null)
      if (pointsRes?.balance !== undefined) {
        setPointsBalance(pointsRes.balance)
        setPointsBalanceKz(pointsRes.balance_kz ?? pointsRes.balance * 1000)
      }
    } catch {
      setSubscription(null)
      setPaymentInfo(null)
    } finally {
      setSubLoading(false)
    }
  }, [])

  useEffect(() => {
    loadSubscription()
  }, [loadSubscription])

  // Alert user when trial/subscription expired (once per session)
  useEffect(() => {
    if (hasExpiredSubscription && !hasShownExpiryAlert.current) {
      hasShownExpiryAlert.current = true
      alert.info(t('profile.subscriptionExpiredTitle'), t('profile.subscriptionExpiredMsg'))
    }
  }, [hasExpiredSubscription])

  const handleLogout = () => {
    dispatch(logout())
  }

  const handlePickAndUploadProof = async () => {
    if (!subscription?.id || isPending('upload')) return
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['image/*', 'application/pdf'],
        copyToCacheDirectory: true,
      })
      if (result.canceled) return
      const file = result.assets[0]
      const filePayload = {
        uri: file.uri,
        name: file.name ?? `proof_${Date.now()}.jpg`,
        type: file.mimeType ?? 'image/jpeg',
      }
      await run(
        async () => {
          await accessApi.uploadSubscriptionPaymentProof(
            subscription.id,
            filePayload as UploadFilePayload,
            uploadNotes || undefined,
          )
          setUploadNotes('')
          await loadSubscription()
          dispatch(checkPaidAccess())
        },
        {
          pendingKey: 'upload',
          pendingMessage: 'feedback.uploading',
          onSuccess: () => alert.success(t('profile.proofSentMsg'), t('profile.proofSentTitle')),
        },
      )
    } catch (error: unknown) {
      alert.error(getApiErrorMessage(error, 'profile.uploadFailed'))
    }
  }

  const handleRedeemSubscription = async (usePartial: boolean = false) => {
    const monthlyPriceKz = paymentInfo?.monthly_price_kz ?? 10000
    const pointsNeeded = monthlyPriceKz / 1000

    if (pointsBalance <= 0) {
      Alert.alert(t('profile.noPointsTitle'), t('profile.noPointsMsg'))
      return
    }

    if (usePartial && pointsBalance < pointsNeeded) {
      const remainingKz = monthlyPriceKz - pointsBalanceKz
      Alert.alert(
        t('profile.partialPointsSubTitle'),
        tw('profile.partialPointsSubMsg', {
          points: pointsBalance.toFixed(1),
          pointsKz: pointsBalanceKz.toFixed(0),
          remainKz: remainingKz.toFixed(0),
        }),
        [
          { text: t('common.cancel'), style: 'cancel' },
          {
            text: t('common.confirm'),
            onPress: () => {
              run(
                async () => {
                  const result = await referralApi.redeemSubscription(pointsBalance)
                  const remain = result.remaining_kz ?? remainingKz
                  Alert.alert(
                    t('profile.pointsAppliedSubTitle'),
                    result.message ||
                      tw('profile.pointsAppliedSubRemain', { remainKz: remain.toFixed(0) }),
                  )
                  await loadSubscription()
                  dispatch(checkPaidAccess())
                },
                {
                  pendingKey: 'redeem',
                  pendingMessage: 'feedback.processingSubscription',
                  silentSuccess: true,
                },
              ).catch(() => {})
            },
          },
        ]
      )
    } else if (pointsBalance >= pointsNeeded) {
      // Full payment
      Alert.alert(
        t('profile.confirmRedeemSubTitle'),
        tw('profile.confirmRedeemSubMsg', {
          points: pointsNeeded.toFixed(1),
          priceKz: monthlyPriceKz.toFixed(0),
        }),
        [
          { text: t('common.cancel'), style: 'cancel' },
          {
            text: t('common.confirm'),
            onPress: () => {
              run(
                async () => {
                  await referralApi.redeemSubscription()
                  Alert.alert(t('common.success'), t('profile.subscriptionRedeemSuccess'))
                  await loadSubscription()
                  dispatch(checkPaidAccess())
                },
                {
                  pendingKey: 'redeem',
                  pendingMessage: 'feedback.processingSubscription',
                  silentSuccess: true,
                },
              ).catch(() => {})
            },
          },
        ]
      )
    } else {
      Alert.alert(
        t('profile.insufficientPointsSubTitle'),
        tw('profile.insufficientPointsSubMsg', {
          needed: pointsNeeded.toFixed(1),
          have: pointsBalance.toFixed(1),
        })
      )
    }
  }

  const handleShareZenda = () => {
    if (isPending('share')) return
    run(
      async () => {
        const shared = await shareZendaApp({ user, t, tw })
        if (!shared) {
          alert.info(t('share.title'), t('share.error'))
        }
      },
      {
        pendingKey: 'share',
        pendingMessage: 'feedback.preparingShare',
        silentSuccess: true,
      },
    ).catch(() => {})
  }

  const handleRequestAccountDeletion = () => {
    Alert.alert(
      t('profile.deleteAccountTitle'),
      t('profile.deleteAccountBody'),
      [
        {
          text: t('common.cancel'),
          style: 'cancel',
        },
        {
          text: t('profile.deleteAccountConfirm'),
          style: 'destructive',
          onPress: async () => {
            try {
              await authApi.requestAccountDeletion()
              Alert.alert(
                t('profile.deleteReceivedTitle'),
                t('profile.deleteReceivedBody'),
                [
                  {
                    text: t('common.ok'),
                    onPress: () => {
                      dispatch(logout())
                    },
                  },
                ]
              )
            } catch (error: unknown) {
              alert.error(getApiErrorMessage(error, 'profile.deleteAccountFailed'))
            }
          },
        },
      ]
    )
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView style={styles.container}>
        {/* Profile Header Card */}
        <Card style={styles.profileCard}>
          <Card.Content style={styles.profileContent}>
            <View style={styles.profileHeader}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>
                  {user?.first_name?.[0]?.toUpperCase() || 'U'}
                </Text>
              </View>
              <View style={styles.profileInfo}>
                <Text variant="titleLarge" style={styles.name}>
                  {user?.first_name} {user?.last_name}
                </Text>
                <Text variant="bodyMedium" style={styles.email}>
                  {user?.email}
                </Text>
                {user?.phone && (
                  <Text variant="bodySmall" style={styles.phone}>
                    {user.phone}
                  </Text>
                )}
              </View>
            </View>
          </Card.Content>
        </Card>

        {/* Points Balance Card */}
        <Card style={styles.pointsCard}>
          <Card.Content>
            <View style={styles.pointsHeader}>
              <View style={styles.pointsIconContainer}>
                <MaterialCommunityIcons name="star-circle" size={32} color="#E67E22" />
              </View>
              <View style={styles.pointsInfo}>
                <Text variant="titleLarge" style={styles.pointsTitle}>
                  {t('education.pointsAvailable')}
                </Text>
                <Text variant="headlineMedium" style={styles.pointsValue}>
                  {tw('education.pointsShort', { points: pointsBalance.toFixed(1) })}
                </Text>
                {locale === 'pt' && (
                  <Text variant="bodyMedium" style={styles.pointsKz}>
                    {tw('education.pointsKzEquivalent', { amount: pointsBalanceKz.toFixed(0) })}
                  </Text>
                )}
              </View>
            </View>
            <Text variant="bodySmall" style={styles.pointsHint}>
              {t('profile.pointsEarnHint')}
            </Text>
            {(subscription?.status === 'trial' || subscription?.status === 'expired' || subscription?.status === 'cancelled') && pointsBalance > 0 && (
              <>
                {pointsBalance >= 10 ? (
                  <Button
                    mode="contained"
                    onPress={() => handleRedeemSubscription(false)}
                    {...buttonProps('redeem')}
                    style={styles.redeemButton}
                    buttonColor="#E67E22"
                    icon="star"
                  >
                    {isPending('redeem')
                      ? t('feedback.processingSubscription')
                      : tw('profile.redeemSubPoints', { points: '10' })}
                  </Button>
                ) : (
                  <Button
                    mode="contained"
                    onPress={() => handleRedeemSubscription(true)}
                    {...buttonProps('redeem')}
                    style={styles.redeemButton}
                    buttonColor="#E67E22"
                    icon="star"
                  >
                    {isPending('redeem')
                      ? t('feedback.processingSubscription')
                      : tw('profile.redeemSubPartialBtn', { points: pointsBalance.toFixed(1) })}
                  </Button>
                )}
              </>
            )}
          </Card.Content>
        </Card>

        {/* Subscription Card — shown when user has a mobile subscription */}
        {!subLoading && subscription && (
          <Card style={styles.subscriptionCard}>
            <View style={styles.subscriptionCardInner}>
            <Card.Content style={styles.subscriptionContent}>
              <View style={styles.subscriptionHeader}>
                <View style={styles.subscriptionTitleRow}>
                  <MaterialCommunityIcons name="shield-check" size={28} color="#3534C9" />
                  <Text variant="titleLarge" style={styles.subscriptionTitle}>
                    {t('profile.mySubscription')}
                  </Text>
                </View>
                {subscription && (
                  <View
                    style={[
                      styles.badge,
                      subscription.status === 'trial' && styles.badgeTrial,
                      subscription.status === 'active' && styles.badgeActive,
                      (subscription.status === 'expired' || subscription.status === 'cancelled') && styles.badgeExpired,
                    ]}
                  >
                    <Text
                      style={[
                        styles.badgeText,
                        subscription.status === 'trial' && styles.badgeTextTrial,
                        subscription.status === 'active' && styles.badgeTextActive,
                        (subscription.status === 'expired' || subscription.status === 'cancelled') && styles.badgeTextExpired,
                      ]}
                    >
                      {subscription.status === 'trial' && t('profile.statusTrial')}
                      {subscription.status === 'active' && t('profile.statusActive')}
                      {(subscription.status === 'expired' || subscription.status === 'cancelled') &&
                        t('profile.statusExpired')}
                    </Text>
                  </View>
                )}
              </View>

              {subscription?.status === 'trial' && subscription.days_until_expiry != null && subscription.days_until_expiry <= 3 && (
                <View style={styles.reminderBanner}>
                  <MaterialCommunityIcons name="information" size={20} color="#3534C9" />
                  <Text variant="bodySmall" style={styles.reminderBannerText}>
                    {t('profile.trialEndingBanner')}
                  </Text>
                </View>
              )}

              {subscription?.status === 'trial' && (
                <>
                  <View style={styles.subscriptionStatusRow}>
                    <MaterialCommunityIcons name="calendar-clock" size={20} color="#3534C9" />
                    <Text variant="bodyLarge" style={styles.subscriptionStatusText}>
                      {subscription.days_until_expiry != null
                        ? subscription.days_until_expiry === 1
                          ? t('profile.trialOneDayLeft')
                          : tw('profile.trialDaysLeft', { days: subscription.days_until_expiry })
                        : t('profile.trialActivePeriod')}
                    </Text>
                  </View>
                  <Text variant="bodyMedium" style={styles.subscriptionHint}>
                    {t('profile.trialPayHint')}
                  </Text>
                </>
              )}

              {subscription?.status === 'active' && subscription.subscription_ends_at && (
                <View style={styles.subscriptionStatusRow}>
                  <MaterialCommunityIcons name="check-circle" size={20} color="#4DB83D" />
                  <Text variant="bodyLarge" style={styles.subscriptionStatusText}>
                    {tw('profile.activeSubscriptionUntil', {
                      date: new Date(subscription.subscription_ends_at).toLocaleDateString(dateLoc, {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                      }),
                    })}
                  </Text>
                </View>
              )}

              {(subscription?.status === 'expired' || subscription?.status === 'cancelled') && (
                <Text variant="bodyMedium" style={styles.subscriptionHint}>
                  {t('profile.expiredRenewHint')}
                </Text>
              )}

              {paymentInfo && (subscription?.status === 'trial' || subscription?.status === 'expired' || subscription?.status === 'cancelled') && (
                <View style={styles.paymentDetails}>
                  <Text variant="labelLarge" style={styles.paymentDetailsTitle}>
                    {t('profile.monthlyPaymentDetails')}
                  </Text>
                  <View style={styles.paymentRow}>
                    <Text variant="bodySmall" style={styles.paymentLabel}>{t('profile.labelAmount')}</Text>
                    <Text variant="bodyLarge" style={styles.paymentValue}>
                      {formatOriginal(
                        paymentInfo.monthly_price_kz,
                        paymentInfo.currency || 'AOA',
                      )}
                      {t('access.perMonth')}
                    </Text>
                  </View>
                  <View style={styles.paymentRow}>
                    <Text variant="bodySmall" style={styles.paymentLabel}>{t('profile.labelIban')}</Text>
                    <Text variant="bodyMedium" style={styles.paymentValue} selectable>
                      {paymentInfo.iban}
                    </Text>
                  </View>
                  <View style={styles.paymentRow}>
                    <Text variant="bodySmall" style={styles.paymentLabel}>{t('profile.labelBeneficiary')}</Text>
                    <Text variant="bodyMedium" style={styles.paymentValue} selectable>
                      {paymentInfo.payee_name}
                    </Text>
                  </View>
                </View>
              )}

              {subscription && subscription.status !== 'cancelled' && (
                <View style={styles.uploadSection}>
                  <TextInput
                    mode="outlined"
                    label={t('access.notesOptional')}
                    placeholder={t('profile.notesPlaceholder')}
                    value={uploadNotes}
                    onChangeText={setUploadNotes}
                    style={styles.notesInput}
                    outlineColor="#e0e7ff"
                    activeOutlineColor="#3534C9"
                  />
                  <Button
                    mode="contained"
                    onPress={handlePickAndUploadProof}
                    {...buttonProps('upload')}
                    style={styles.uploadButton}
                    buttonColor="#3534C9"
                    contentStyle={styles.uploadButtonContent}
                    labelStyle={styles.uploadButtonLabel}
                    icon={() => <MaterialCommunityIcons name="upload" size={22} color="#fff" />}
                  >
                    {actionLabel('access.uploadProof', 'upload', 'feedback.uploading')}
                  </Button>
                  <Text variant="bodySmall" style={styles.uploadHint}>
                    {t('access.proofHint')}
                  </Text>
                </View>
              )}
            </Card.Content>
            </View>
          </Card>
        )}

        {subLoading && (
          <Card style={styles.subscriptionCard}>
            <View style={styles.subscriptionCardInner}>
              <Card.Content style={styles.subscriptionContent}>
                <ZendaLoader message={t('loading.subscription')} />
              </Card.Content>
            </View>
          </Card>
        )}

        {/* Menu Options */}
        <Card style={styles.card}>
          <Card.Content>
            <TouchableOpacity
              onPress={handleShareZenda}
              activeOpacity={0.7}
              disabled={isPending('share')}
            >
              <View style={styles.menuItem}>
                <View style={styles.menuItemLeft}>
                  <View style={[styles.menuIconContainer, { backgroundColor: '#eef2ff' }]}>
                    <MaterialCommunityIcons name="share-variant" size={24} color="#3534C9" />
                  </View>
                  <View style={styles.menuItemText}>
                    <Text variant="titleMedium" style={styles.menuItemTitle}>
                      {isPending('share') ? t('feedback.preparingShare') : t('share.button')}
                    </Text>
                    <Text variant="bodySmall" style={styles.menuItemSubtitle}>
                      {t('education.pointsShareHint')}
                    </Text>
                  </View>
                </View>
                <MaterialCommunityIcons name="chevron-right" size={24} color="#9ca3af" />
              </View>
            </TouchableOpacity>
            <Divider style={styles.divider} />
            <TouchableOpacity
              onPress={() => navigation.navigate('Settings')}
              activeOpacity={0.7}
            >
              <View style={styles.menuItem}>
                <View style={styles.menuItemLeft}>
                  <View style={[styles.menuIconContainer, { backgroundColor: '#f0f4ff' }]}>
                    <MaterialCommunityIcons name="cog" size={24} color="#3534C9" />
                  </View>
                  <View style={styles.menuItemText}>
                    <Text variant="titleMedium" style={styles.menuItemTitle}>
                      {t('profile.menuSettings')}
                    </Text>
                    <Text variant="bodySmall" style={styles.menuItemSubtitle}>
                      {t('profile.menuSettingsSub')}
                    </Text>
                  </View>
                </View>
                <MaterialCommunityIcons name="chevron-right" size={24} color="#9ca3af" />
              </View>
            </TouchableOpacity>
            <Divider style={styles.divider} />
            <TouchableOpacity
              onPress={() => navigation.navigate('About')}
              activeOpacity={0.7}
            >
              <View style={styles.menuItem}>
                <View style={styles.menuItemLeft}>
                  <View style={[styles.menuIconContainer, { backgroundColor: '#ecfdf5' }]}>
                    <MaterialCommunityIcons name="information" size={24} color="#4DB83D" />
                  </View>
                  <View style={styles.menuItemText}>
                    <Text variant="titleMedium" style={styles.menuItemTitle}>
                      {t('profile.menuAbout')}
                    </Text>
                    <Text variant="bodySmall" style={styles.menuItemSubtitle}>
                      {t('profile.menuAboutSub')}
                    </Text>
                  </View>
                </View>
                <MaterialCommunityIcons name="chevron-right" size={24} color="#9ca3af" />
              </View>
            </TouchableOpacity>
            <Divider style={styles.divider} />
            <TouchableOpacity
              onPress={() => navigation.navigate('HelpSupport')}
              activeOpacity={0.7}
            >
              <View style={styles.menuItem}>
                <View style={styles.menuItemLeft}>
                  <View style={[styles.menuIconContainer, { backgroundColor: '#fffbeb' }]}>
                    <MaterialCommunityIcons name="help-circle" size={24} color="#E67E22" />
                  </View>
                  <View style={styles.menuItemText}>
                    <Text variant="titleMedium" style={styles.menuItemTitle}>
                      {t('profile.menuHelp')}
                    </Text>
                    <Text variant="bodySmall" style={styles.menuItemSubtitle}>
                      {t('profile.menuHelpSub')}
                    </Text>
                  </View>
                </View>
                <MaterialCommunityIcons name="chevron-right" size={24} color="#9ca3af" />
              </View>
            </TouchableOpacity>
            <Divider style={styles.divider} />
            <TouchableOpacity
              onPress={handleRequestAccountDeletion}
              activeOpacity={0.7}
            >
              <View style={styles.menuItem}>
                <View style={styles.menuItemLeft}>
                  <View style={[styles.menuIconContainer, { backgroundColor: '#fee2e2' }]}>
                    <MaterialCommunityIcons name="delete-forever" size={24} color={colors.danger} />
                  </View>
                  <View style={styles.menuItemText}>
                    <Text variant="titleMedium" style={[styles.menuItemTitle, styles.deleteTitle]}>
                      {t('profile.deleteAccountTitle')}
                    </Text>
                    <Text variant="bodySmall" style={styles.menuItemSubtitle}>
                      {t('profile.deleteAccountMenuSub')}
                    </Text>
                  </View>
                </View>
                <MaterialCommunityIcons name="chevron-right" size={24} color="#9ca3af" />
              </View>
            </TouchableOpacity>
          </Card.Content>
        </Card>

        {/* Logout Button */}
        <View style={styles.logoutContainer}>
          <Button
            mode="contained"
            onPress={handleLogout}
            buttonColor={colors.danger}
            style={styles.logoutButton}
            contentStyle={styles.logoutButtonContent}
            labelStyle={styles.logoutButtonLabel}
            icon="logout"
          >
            {t('profile.logoutButton')}
          </Button>
        </View>
      </ScrollView>
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
  },
  profileCard: {
    margin: 16,
    marginBottom: 0,
    borderRadius: 20,
    elevation: 4,
    backgroundColor: '#ffffff',
    shadowColor: '#3534C9',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  profileContent: {
    padding: 20,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#3534C9',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#e0e7ff',
  },
  avatarText: {
    color: '#fff',
    fontSize: 32,
    fontWeight: '700',
  },
  profileInfo: {
    marginLeft: 20,
    flex: 1,
  },
  name: {
    fontWeight: '700',
    marginBottom: 6,
    color: '#1f2937',
    letterSpacing: -0.5,
  },
  email: {
    color: '#6b7280',
    marginBottom: 4,
  },
  phone: {
    color: '#9ca3af',
  },
  card: {
    margin: 16,
    marginTop: 16,
    borderRadius: 20,
    elevation: 2,
    backgroundColor: '#ffffff',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  menuIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  menuItemText: {
    flex: 1,
  },
  menuItemTitle: {
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
  },
  menuItemSubtitle: {
    color: '#6b7280',
    fontSize: 13,
  },
  divider: {
    marginVertical: 0,
    backgroundColor: '#e5e7eb',
  },
  logoutContainer: {
    padding: 16,
    paddingTop: 8,
  },
  logoutButton: {
    borderRadius: 12,
    elevation: 2,
  },
  logoutButtonContent: {
    paddingVertical: 8,
    height: 52,
  },
  logoutButtonLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  deleteTitle: {
    color: colors.danger,
  },
  subscriptionCard: {
    margin: 16,
    marginTop: 16,
    borderRadius: 20,
    elevation: 4,
    backgroundColor: '#ffffff',
    shadowColor: '#3534C9',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
  },
  subscriptionCardInner: {
    overflow: 'hidden',
    borderRadius: 20,
  },
  subscriptionContent: {
    padding: 24,
  },
  subscriptionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    flexWrap: 'wrap',
    gap: 12,
  },
  subscriptionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  subscriptionTitle: {
    fontWeight: '700',
    color: '#1f2937',
    letterSpacing: -0.3,
  },
  badge: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  badgeTrial: {
    backgroundColor: '#eef2ff',
  },
  badgeActive: {
    backgroundColor: '#d1fae5',
  },
  badgeExpired: {
    backgroundColor: '#fee2e2',
  },
  badgeText: {
    fontSize: 13,
    fontWeight: '700',
  },
  badgeTextTrial: {
    color: '#1E2070',
  },
  badgeTextActive: {
    color: '#047857',
  },
  badgeTextExpired: {
    color: '#b91c1c',
  },
  reminderBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#eef2ff',
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#3534C9',
  },
  reminderBannerText: {
    flex: 1,
    color: '#1E2070',
    fontWeight: '500',
  },
  subscriptionStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  subscriptionStatusText: {
    color: '#374151',
    fontWeight: '500',
    flex: 1,
  },
  subscriptionHint: {
    color: '#6b7280',
    lineHeight: 22,
    marginBottom: 16,
  },
  expiredNotice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: '#fef2f2',
    padding: 14,
    borderRadius: 12,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#b91c1c',
  },
  expiredNoticeText: {
    flex: 1,
    color: '#991b1b',
    lineHeight: 22,
    fontWeight: '500',
  },
  paymentDetails: {
    backgroundColor: '#f8fafc',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  paymentDetailsTitle: {
    fontWeight: '600',
    color: '#475569',
    marginBottom: 12,
    fontSize: 13,
  },
  paymentRow: {
    marginBottom: 10,
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
  uploadSection: {
    marginTop: 4,
  },
  notesInput: {
    backgroundColor: '#fff',
    marginBottom: 12,
  },
  uploadButton: {
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#3534C9',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
  },
  uploadButtonContent: {
    paddingVertical: 10,
    height: 52,
  },
  uploadButtonLabel: {
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  pointsCard: {
    marginBottom: 16,
    borderRadius: 16,
    backgroundColor: '#fef3c7',
    borderWidth: 1,
    borderColor: '#fde68a',
  },
  pointsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  pointsIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#fbbf24',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  pointsInfo: {
    flex: 1,
  },
  pointsTitle: {
    color: '#92400e',
    fontWeight: '600',
    marginBottom: 4,
  },
  pointsValue: {
    color: '#92400e',
    fontWeight: 'bold',
  },
  pointsKz: {
    color: '#a16207',
    marginTop: 4,
  },
  pointsHint: {
    color: '#78350f',
    fontSize: 12,
    marginTop: 8,
    fontStyle: 'italic',
  },
  redeemButton: {
    marginTop: 12,
    borderRadius: 12,
  },
  uploadHint: {
    color: '#9ca3af',
    marginTop: 10,
    textAlign: 'center',
  },
})
