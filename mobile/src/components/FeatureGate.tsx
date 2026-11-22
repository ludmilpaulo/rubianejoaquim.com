import React from 'react'
import { StyleSheet, View } from 'react-native'
import { Button, Text } from 'react-native-paper'
import { useNavigation, type NavigationProp, type ParamListBase } from '@react-navigation/native'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useI18n } from '../contexts/I18nContext'
import { useHasFeature } from '../hooks/useFeatureAccess'
import ZendaCard from './ui/ZendaCard'
import { colors, spacing } from '../theme'
import type { ZendaFeature } from '../utils/subscriptionTier'

function openUpgrade(navigation: NavigationProp<ParamListBase>) {
  const names = navigation.getState()?.routeNames ?? []
  if (names.includes('Profile')) {
    navigation.navigate('Profile')
    return
  }
  const parent = navigation.getParent()
  if (parent) {
    parent.navigate('Profile')
  }
}

export function FeatureGate({
  feature,
  children,
}: {
  feature: ZendaFeature
  children: React.ReactNode
}) {
  const allowed = useHasFeature(feature)
  const { t } = useI18n()
  const navigation = useNavigation<NavigationProp<ParamListBase>>()

  if (allowed) return <>{children}</>

  const featureKey = `premium.feature_${feature}`
  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.wrap}>
        <ZendaCard accentColor={colors.brand.primary}>
          <MaterialCommunityIcons name="lock-outline" size={36} color={colors.brand.primary} />
          <Text variant="titleLarge" style={styles.title}>{t('premium.lockedTitle')}</Text>
          <Text variant="bodyMedium" style={styles.body}>{t('premium.lockedBody')}</Text>
          <Text variant="titleSmall" style={styles.feature}>{t(featureKey)}</Text>
          <Button mode="contained" onPress={() => openUpgrade(navigation)} style={styles.button}>
            {t('premium.upgrade')}
          </Button>
        </ZendaCard>
      </View>
    </SafeAreaView>
  )
}

export function withFeature<P extends object>(
  feature: ZendaFeature,
  Screen: React.ComponentType<P>,
) {
  function GatedScreen(props: P) {
    return (
      <FeatureGate feature={feature}>
        <Screen {...props} />
      </FeatureGate>
    )
  }
  GatedScreen.displayName = `WithFeature(${Screen.displayName || Screen.name || 'Screen'})`
  return GatedScreen
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background.default },
  wrap: { flex: 1, justifyContent: 'center', padding: spacing.lg },
  title: { marginTop: spacing.md, color: colors.text.primary, fontWeight: '700' },
  body: { marginTop: spacing.sm, color: colors.text.secondary },
  feature: { marginTop: spacing.md, color: colors.brand.primary },
  button: { marginTop: spacing.lg },
})
