import React, { useState, useEffect } from 'react'
import { View, StyleSheet, ScrollView, Switch, Alert } from 'react-native'
import { Text, Card, List, Divider } from 'react-native-paper'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useAppSelector } from '../hooks/redux'
import { Linking } from 'react-native'
import { areNotificationsEnabled, getNotificationPrefs, setNotificationPrefs as persistNotificationPrefs, setNotificationsEnabled as persistNotificationsEnabled } from '../utils/notifications'
import type { NotificationPrefs } from '../types'
import { useAppDispatch } from '../hooks/redux'
import { setUser } from '../store/authSlice'
import { useI18n } from '../contexts/I18nContext'
import { useCurrency } from '../contexts/CurrencyContext'
import { useAppAppearance } from '../contexts/AppAppearanceContext'
import { useAlert } from '../hooks/useAlert'
import { useActionFeedback } from '../hooks/useActionFeedback'
import { ZendaLoading } from '../components/ui/ZendaLoader'
import type { Locale } from '../i18n'
import { authApi } from '../services/api'
import type { SocialLoginMethods } from '../types/api'
import {
  authenticateWithBiometric,
  getBiometricType,
  isBiometricAppLockEnabled,
  isBiometricAvailable,
  setBiometricAppLockEnabled,
} from '../utils/biometric'

export default function SettingsScreen() {
  const dispatch = useAppDispatch()
  const { locale, localeMode, setLocale, useDeviceLanguage, locales, t, tw } = useI18n()
  const { currency, setCurrency, currencyLabel, currencies } = useCurrency()
  const { isDarkMode, setDarkMode } = useAppAppearance()
  const alert = useAlert()
  const { run, isPending, anyPending, pendingLabel } = useActionFeedback()
  const { user } = useAppSelector((state) => state.auth)
  const [notificationsEnabled, setNotificationsEnabled] = useState(true)
  const [notificationPrefs, setNotificationPrefsState] = useState<NotificationPrefs>({
    budget_warnings: true,
    budget_exceeded: true,
    debt_reminders: true,
    savings_reminders: true,
    monthly_summary: true,
    goal_reminders: true,
  })
  const [biometricEnabled, setBiometricEnabled] = useState(false)
  const [biometricAvailable, setBiometricAvailable] = useState(false)
  const [biometricType, setBiometricType] = useState('Biometric')
  const [loginMethods, setLoginMethods] = useState<
    Pick<SocialLoginMethods, 'email' | 'google' | 'facebook' | 'tiktok' | 'apple'>
  | null>(null)

  useEffect(() => {
    areNotificationsEnabled().then(setNotificationsEnabled)
    getNotificationPrefs().then(setNotificationPrefsState)
    if (user?.notification_prefs) {
      setNotificationPrefsState((prev) => ({ ...prev, ...user.notification_prefs }))
    }
    isBiometricAvailable()
      .then(async (available) => {
        setBiometricAvailable(available)
        if (available) {
          setBiometricType(await getBiometricType())
        }
      })
      .catch(() => setBiometricAvailable(false))
    isBiometricAppLockEnabled().then(setBiometricEnabled).catch(() => setBiometricEnabled(false))
    authApi
      .loginMethods()
      .then((m) =>
        setLoginMethods({
          email: m.email,
          google: m.google,
          facebook: m.facebook,
          tiktok: m.tiktok,
          apple: m.apple,
        })
      )
      .catch(() => setLoginMethods(null))
  }, [user?.notification_prefs])

  const persistPrefs = (next: NotificationPrefs) => {
    run(
      async () => {
        setNotificationPrefsState(next)
        await persistNotificationPrefs(next)
        const updated = await authApi.updateProfile({ notification_prefs: next })
        if (updated && typeof updated === 'object') {
          dispatch(setUser(updated))
        }
      },
      {
        pendingKey: 'settings',
        pendingMessage: 'feedback.updatingSettings',
        silentSuccess: true,
      },
    ).catch(() => {})
  }

  const handleNotificationPrefToggle = (key: keyof NotificationPrefs, value: boolean) => {
    if (isPending('settings')) return
    const next = { ...notificationPrefs, [key]: value }
    persistPrefs(next)
  }

  const handleNotificationsToggle = (value: boolean) => {
    setNotificationsEnabled(value)
    persistNotificationsEnabled(value).catch(() => {})
  }

  const handleClearCache = () => {
    alert.confirm(
      t('settings.clearCache'),
      t('settings.clearCacheConfirm'),
      () => alert.success(t('settings.clearCacheDone')),
      { confirmLabel: t('settings.clearCache') },
    )
  }

  const handleExportData = () => {
    alert.info(t('settings.exportData'), t('settings.exportSoon'))
  }

  const handleBiometricToggle = async (value: boolean) => {
    if (value) {
      if (!biometricAvailable) {
        alert.info(t('settings.biometricUnavailableTitle'), t('settings.biometricUnavailableBody'))
        return
      }

      const authenticated = await authenticateWithBiometric({
        promptMessage: t('settings.appLockPrompt'),
        cancelLabel: t('common.cancel'),
        fallbackLabel: t('settings.biometricFallback'),
      })
      if (!authenticated) return
    }

    await setBiometricAppLockEnabled(value)
    setBiometricEnabled(value)
    alert.success(value ? t('settings.biometricEnabled') : t('settings.biometricDisabled'))
  }

  const handleDarkModeToggle = (value: boolean) => {
    setDarkMode(value).catch(() => {})
  }

  const localeLabel = (code: Locale) => t(`localeNames.${code}`)

  const languageDescription =
    localeMode === 'device'
      ? tw('settings.deviceLanguageActive', { locale: localeLabel(locale) })
      : localeLabel(locale)

  const handlePrivacyPolicy = () => {
    Linking.openURL('https://www.rubianejoaquim.com/privacy-policy')
  }

  const loginMethodLabels: Record<string, string> = {
    email: t('settings.emailPassword'),
    google: 'Google',
    facebook: 'Facebook',
    tiktok: 'TikTok',
    apple: 'Apple',
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ZendaLoading visible={anyPending} fullScreen message={pendingLabel} />
      <ScrollView style={styles.container}>
        {/* Account Section */}
        <Card style={styles.card}>
          <Card.Content>
            <Text variant="titleMedium" style={styles.sectionTitle}>{t('settings.account')}</Text>
            <List.Item
              title={t('settings.email')}
              description={user?.email}
              left={(props) => <List.Icon {...props} icon="email" color="#6366f1" />}
            />
            <Divider />
            <List.Item
              title={t('settings.name')}
              description={`${user?.first_name || ''} ${user?.last_name || ''}`}
              left={(props) => <List.Icon {...props} icon="account" color="#6366f1" />}
            />
          </Card.Content>
        </Card>

        {loginMethods ? (
          <Card style={styles.card}>
            <Card.Content>
              <Text variant="titleMedium" style={styles.sectionTitle}>
                {t('settings.loginSecurity')}
              </Text>
              {(
                [
                  ['email', loginMethods.email],
                  ['google', loginMethods.google],
                  ['facebook', loginMethods.facebook],
                  ['tiktok', loginMethods.tiktok],
                  ['apple', loginMethods.apple],
                ] as const
              ).map(([key, linked], index) => (
                <React.Fragment key={key}>
                  {index > 0 ? <Divider /> : null}
                  <List.Item
                    title={loginMethodLabels[key]}
                    description={linked ? t('settings.linked') : t('settings.notLinked')}
                    left={(props) => (
                      <List.Icon
                        {...props}
                        icon={linked ? 'check-circle' : 'circle-outline'}
                        color={linked ? '#16a34a' : '#9ca3af'}
                      />
                    )}
                    right={
                      linked && key !== 'email'
                        ? () => (
                            <Text
                              style={{ color: '#dc2626', alignSelf: 'center', marginRight: 8 }}
                              onPress={() => {
                                const label = loginMethodLabels[key]
                                Alert.alert(t('settings.removeMethodTitle'), tw('settings.removeMethodConfirm', { label }), [
                                  { text: t('common.cancel'), style: 'cancel' },
                                  {
                                    text: t('common.delete'),
                                    style: 'destructive',
                                    onPress: () => {
                                      authApi
                                        .unlinkSocial(key)
                                        .then((res) => {
                                          const m = res.methods
                                          setLoginMethods({
                                            email: m.email,
                                            google: m.google,
                                            facebook: m.facebook,
                                            tiktok: m.tiktok,
                                            apple: m.apple,
                                          })
                                        })
                                        .catch((err) => {
                                          alert.info(
                                            t('settings.loginSecurity'),
                                            err?.response?.data?.error || t('settings.unlinkFailed')
                                          )
                                        })
                                    },
                                  },
                                ])
                              }}
                            >
                              {t('common.delete')}
                            </Text>
                          )
                        : undefined
                    }
                  />
                </React.Fragment>
              ))}
            </Card.Content>
          </Card>
        ) : null}

        {/* Preferences Section */}
        <Card style={styles.card}>
          <Card.Content>
            <Text variant="titleMedium" style={styles.sectionTitle}>{t('settings.title')}</Text>
            <List.Item
              title={t('settings.language')}
              description={languageDescription}
              left={(props) => <List.Icon {...props} icon="translate" color="#6366f1" />}
              disabled={isPending('language')}
              onPress={() => {
                if (isPending('language')) return
                Alert.alert(t('settings.language'), '', [
                  {
                    text: t('settings.useDeviceLanguage'),
                    onPress: () => {
                      run(() => useDeviceLanguage(), {
                        pendingKey: 'language',
                        pendingMessage: 'feedback.updatingLanguage',
                        silentSuccess: true,
                      }).catch(() => {})
                    },
                  },
                  ...locales.map((code) => ({
                    text: localeLabel(code),
                    onPress: () => {
                      run(() => setLocale(code), {
                        pendingKey: 'language',
                        pendingMessage: 'feedback.updatingLanguage',
                        silentSuccess: true,
                      }).catch(() => {})
                    },
                  })),
                ])
              }}
            />
            <Divider />
            <List.Item
              title={t('settings.currency')}
              description={currencyLabel(currency)}
              left={(props) => <List.Icon {...props} icon="currency-usd" color="#6366f1" />}
              disabled={isPending('currency')}
              onPress={() => {
                if (isPending('currency')) return
                Alert.alert(
                  t('settings.currency'),
                  '',
                  currencies.map((code) => ({
                    text: currencyLabel(code),
                    onPress: () => {
                      run(() => setCurrency(code), {
                        pendingKey: 'currency',
                        pendingMessage: 'feedback.updatingCurrency',
                        silentSuccess: true,
                      }).catch(() => {})
                    },
                  })),
                )
              }}
            />
            <Divider />
            <List.Item
              title={t('settings.notifications')}
              description={t('settings.notificationsDesc')}
              left={(props) => <List.Icon {...props} icon="bell" color="#6366f1" />}
              right={() => (
                <Switch
                  value={notificationsEnabled}
                  onValueChange={handleNotificationsToggle}
                  trackColor={{ false: '#d1d5db', true: '#a5b4fc' }}
                  thumbColor={notificationsEnabled ? '#6366f1' : '#f3f4f6'}
                />
              )}
            />
            {notificationsEnabled ? (
              <>
                <Divider />
                <Text variant="labelMedium" style={styles.notifSectionTitle}>
                  {t('settings.notifTypesTitle')}
                </Text>
                {(
                  [
                    ['budget_warnings', 'settings.notifBudgetWarnings'],
                    ['budget_exceeded', 'settings.notifBudgetExceeded'],
                    ['debt_reminders', 'settings.notifDebtReminders'],
                    ['savings_reminders', 'settings.notifSavingsReminders'],
                    ['monthly_summary', 'settings.notifMonthlySummary'],
                    ['goal_reminders', 'settings.notifGoalReminders'],
                  ] as const
                ).map(([key, labelKey]) => (
                  <List.Item
                    key={key}
                    title={t(labelKey)}
                    right={() => (
                      <Switch
                        value={notificationPrefs[key] !== false}
                        onValueChange={(value) => handleNotificationPrefToggle(key, value)}
                        trackColor={{ false: '#d1d5db', true: '#a5b4fc' }}
                        thumbColor={notificationPrefs[key] !== false ? '#6366f1' : '#f3f4f6'}
                        disabled={isPending('settings')}
                      />
                    )}
                  />
                ))}
              </>
            ) : null}
            <Divider />
            <List.Item
              title={t('settings.biometricTitle')}
              description={
                biometricAvailable
                  ? tw('settings.biometricAppLockDesc', { type: biometricType })
                  : t('settings.biometricUnavailableBody')
              }
              left={(props) => <List.Icon {...props} icon="fingerprint" color="#6366f1" />}
              right={() => (
                <Switch
                  value={biometricEnabled}
                  onValueChange={handleBiometricToggle}
                  trackColor={{ false: '#d1d5db', true: '#a5b4fc' }}
                  thumbColor={biometricEnabled ? '#6366f1' : '#f3f4f6'}
                  disabled={!biometricAvailable}
                />
              )}
            />
            <Divider />
            <List.Item
              title={t('settings.darkModeTitle')}
              description={t('settings.darkModeDesc')}
              left={(props) => <List.Icon {...props} icon="theme-light-dark" color="#6366f1" />}
              right={() => (
                <Switch
                  value={isDarkMode}
                  onValueChange={handleDarkModeToggle}
                  trackColor={{ false: '#d1d5db', true: '#a5b4fc' }}
                  thumbColor={isDarkMode ? '#6366f1' : '#f3f4f6'}
                />
              )}
            />
          </Card.Content>
        </Card>

        {/* Data Section */}
        <Card style={styles.card}>
          <Card.Content>
            <Text variant="titleMedium" style={styles.sectionTitle}>{t('settings.data')}</Text>
            <List.Item
              title={t('settings.exportData')}
              description={t('settings.exportDataDesc')}
              left={(props) => <List.Icon {...props} icon="download" color="#10b981" />}
              onPress={handleExportData}
            />
            <Divider />
            <List.Item
              title={t('settings.clearCache')}
              description={t('settings.clearCacheDesc')}
              left={(props) => <List.Icon {...props} icon="delete-sweep" color="#f59e0b" />}
              onPress={handleClearCache}
            />
          </Card.Content>
        </Card>

        {/* Legal Section */}
        <Card style={styles.card}>
          <Card.Content>
            <Text variant="titleMedium" style={styles.sectionTitle}>{t('settings.legal')}</Text>
            <List.Item
              title={t('settings.privacy')}
              description={t('settings.privacyDesc')}
              left={(props) => <List.Icon {...props} icon="shield-lock" color="#8b5cf6" />}
              onPress={handlePrivacyPolicy}
              right={(props) => <List.Icon {...props} icon="chevron-right" />}
            />
            <Divider />
            <List.Item
              title={t('settings.terms')}
              description={t('settings.termsDesc')}
              left={(props) => <List.Icon {...props} icon="file-document" color="#8b5cf6" />}
              onPress={() => Linking.openURL('https://www.rubianejoaquim.com/legal')}
              right={(props) => <List.Icon {...props} icon="chevron-right" />}
            />
          </Card.Content>
        </Card>

        {/* App Info */}
        <View style={styles.appInfo}>
          <Text variant="bodySmall" style={styles.appVersion}>
            {tw('settings.versionLabel', { version: '1.0.3' })}
          </Text>
          <Text variant="bodySmall" style={styles.appCopyright}>
            {tw('settings.copyright', { year: new Date().getFullYear() })}
          </Text>
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
  card: {
    margin: 16,
    marginBottom: 0,
    borderRadius: 16,
    elevation: 2,
    backgroundColor: '#ffffff',
  },
  sectionTitle: {
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 12,
    letterSpacing: -0.3,
  },
  notifSectionTitle: {
    color: '#6b7280',
    marginTop: 8,
    marginBottom: 4,
    paddingHorizontal: 16,
  },
  appInfo: {
    alignItems: 'center',
    padding: 24,
    marginBottom: 16,
  },
  appVersion: {
    color: '#6b7280',
    marginBottom: 4,
  },
  appCopyright: {
    color: '#9ca3af',
    fontSize: 12,
  },
})
