import React, { useState } from 'react'
import { ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native'
import { Button, Text } from 'react-native-paper'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useI18n } from '../contexts/I18nContext'
import type { Locale } from '../i18n'
import { colors, radius, spacing, typography } from '../theme'
import { authApi } from '../services/api'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { useAppDispatch } from '../hooks/redux'
import { setUser } from '../store/authSlice'
import { getDefaultCurrency, SUPPORTED_CURRENCIES, type CurrencyCode } from '../utils/currency'

const GOAL_IDS = ['save', 'debt', 'business', 'learn', 'budget'] as const
const LEVEL_IDS = ['beginner', 'intermediate', 'advanced'] as const

interface OnboardingSetupScreenProps {
  onComplete: () => void
}

/** Read onboarding preferences from Django profile (via stored user) or defaults. */
export function getOnboardingPreferencesFromUser(user: {
  onboarding_goals?: string[]
  finance_level?: string
} | null | undefined): { goals: string[]; level: string } {
  return {
    goals: Array.isArray(user?.onboarding_goals) ? user.onboarding_goals : [],
    level: user?.finance_level || 'beginner',
  }
}

export default function OnboardingSetupScreen({ onComplete }: OnboardingSetupScreenProps) {
  const dispatch = useAppDispatch()
  const { t, locale, setLocale, locales } = useI18n()
  const [step, setStep] = useState(0)
  const [selectedLocale, setSelectedLocale] = useState<Locale>(locale)
  const [currency, setCurrency] = useState<CurrencyCode>(() => getDefaultCurrency())
  const [goals, setGoals] = useState<string[]>([])
  const [level, setLevel] = useState<string>('beginner')
  const [saving, setSaving] = useState(false)

  const toggleGoal = (id: string) => {
    setGoals((prev) => (prev.includes(id) ? prev.filter((g) => g !== id) : [...prev, id]))
  }

  const pickLocale = (code: Locale) => {
    setSelectedLocale(code)
    void setLocale(code)
  }

  const finish = async () => {
    setSaving(true)
    try {
      if (selectedLocale !== locale) {
        await setLocale(selectedLocale)
      }
      await authApi.updateProfile({
        preferred_locale: selectedLocale,
        preferred_currency: currency,
        onboarding_goals: goals,
        finance_level: level,
      })
      const user = await authApi.me()
      dispatch(setUser(user))
      await AsyncStorage.setItem('user', JSON.stringify(user))
    } catch {
      // Locale/currency still applied via setLocale; goals/level retry on next profile edit
    } finally {
      setSaving(false)
      onComplete()
    }
  }

  const steps = [
    {
      title: t('onboarding.setup.languageTitle'),
      body: t('onboarding.setup.languageBody'),
      content: (
        <View style={styles.chipGrid}>
          {locales.map((code) => (
            <TouchableOpacity
              key={code}
              style={[styles.chip, selectedLocale === code && styles.chipActive]}
              onPress={() => pickLocale(code)}
            >
              <Text style={[styles.chipText, selectedLocale === code && styles.chipTextActive]}>
                {t(`localeNames.${code}`)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      ),
    },
    {
      title: t('onboarding.setup.currencyTitle'),
      body: t('onboarding.setup.currencyBody'),
      content: (
        <View style={styles.chipGrid}>
          {SUPPORTED_CURRENCIES.map((code) => (
            <TouchableOpacity
              key={code}
              style={[styles.chip, currency === code && styles.chipActive]}
              onPress={() => setCurrency(code)}
            >
              <Text style={[styles.chipText, currency === code && styles.chipTextActive]}>{code}</Text>
            </TouchableOpacity>
          ))}
        </View>
      ),
    },
    {
      title: t('onboarding.setup.goalsTitle'),
      body: t('onboarding.setup.goalsBody'),
      content: (
        <View style={styles.goalList}>
          {GOAL_IDS.map((id) => (
            <TouchableOpacity
              key={id}
              style={[styles.goalRow, goals.includes(id) && styles.goalRowActive]}
              onPress={() => toggleGoal(id)}
            >
              <MaterialCommunityIcons
                name={goals.includes(id) ? 'checkbox-marked-circle' : 'checkbox-blank-circle-outline'}
                size={24}
                color={goals.includes(id) ? colors.brand.primary : colors.text.muted}
              />
              <Text style={styles.goalLabel}>{t(`onboarding.setup.goal_${id}`)}</Text>
            </TouchableOpacity>
          ))}
        </View>
      ),
    },
    {
      title: t('onboarding.setup.levelTitle'),
      body: t('onboarding.setup.levelBody'),
      content: (
        <View style={styles.levelList}>
          {LEVEL_IDS.map((id) => (
            <TouchableOpacity
              key={id}
              style={[styles.levelCard, level === id && styles.levelCardActive]}
              onPress={() => setLevel(id)}
            >
              <Text style={[styles.levelTitle, level === id && styles.levelTitleActive]}>
                {t(`onboarding.setup.level_${id}`)}
              </Text>
              <Text style={styles.levelDesc}>{t(`onboarding.setup.level_${id}_desc`)}</Text>
            </TouchableOpacity>
          ))}
        </View>
      ),
    },
  ]

  const current = steps[step]

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.progress}>
        {steps.map((_, i) => (
          <View key={i} style={[styles.progressDot, i <= step && styles.progressDotActive]} />
        ))}
      </View>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={styles.overline}>{t('onboarding.setup.label')}</Text>
        <Text style={styles.title}>{current.title}</Text>
        <Text style={styles.body}>{current.body}</Text>
        {current.content}
      </ScrollView>
      <View style={styles.footer}>
        {step > 0 ? (
          <Button mode="text" onPress={() => setStep(step - 1)}>
            {t('onboarding.setup.back')}
          </Button>
        ) : (
          <View />
        )}
        {step < steps.length - 1 ? (
          <Button mode="contained" onPress={() => setStep(step + 1)} style={styles.btn}>
            {t('onboarding.next')}
          </Button>
        ) : (
          <Button mode="contained" onPress={finish} loading={saving} style={styles.btn}>
            {t('onboarding.start')}
          </Button>
        )}
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background.default },
  progress: { flexDirection: 'row', gap: 6, paddingHorizontal: spacing.lg, paddingTop: spacing.md },
  progressDot: { flex: 1, height: 4, borderRadius: 2, backgroundColor: colors.border.medium },
  progressDotActive: { backgroundColor: colors.brand.primary },
  scroll: { padding: spacing.lg, paddingBottom: spacing.xxl },
  overline: { ...typography.overline, color: colors.brand.primary, marginBottom: spacing.sm },
  title: { ...typography.h1, color: colors.text.primary, marginBottom: spacing.sm },
  body: { ...typography.body, color: colors.text.secondary, marginBottom: spacing.lg },
  chipGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border.light,
    backgroundColor: colors.background.paper,
  },
  chipActive: { backgroundColor: colors.brand.primary, borderColor: colors.brand.primary },
  chipText: { ...typography.label, color: colors.text.secondary },
  chipTextActive: { color: colors.text.inverse },
  goalList: { gap: spacing.sm },
  goalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.background.paper,
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  goalRowActive: { borderColor: colors.brand.primaryLight, backgroundColor: '#E8E8FA' },
  goalLabel: { ...typography.body, color: colors.text.primary, flex: 1 },
  levelList: { gap: spacing.sm },
  levelCard: {
    padding: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: colors.background.paper,
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  levelCardActive: { borderColor: colors.brand.primary, backgroundColor: '#E8E8FA' },
  levelTitle: { ...typography.h3, color: colors.text.primary },
  levelTitleActive: { color: colors.brand.primary },
  levelDesc: { ...typography.caption, color: colors.text.secondary, marginTop: 4 },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border.light,
    backgroundColor: colors.background.paper,
  },
  btn: { borderRadius: radius.md },
})
