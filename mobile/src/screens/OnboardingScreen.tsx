import React, { useRef, useState } from 'react'
import { Dimensions, FlatList, StyleSheet, View, type NativeSyntheticEvent, type NativeScrollEvent } from 'react-native'
import { Button, Text } from 'react-native-paper'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { SafeAreaView } from 'react-native-safe-area-context'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { useI18n } from '../contexts/I18nContext'
import { colors, spacing } from '../theme'
import { authApi } from '../services/api'
import OnboardingSetupScreen from './OnboardingSetupScreen'

const { width } = Dimensions.get('window')
const ONBOARDING_KEY = 'ZENDA_ONBOARDING_DONE'

const SLIDES = [
  { icon: 'wallet-plus' as const, titleKey: 'onboarding.slide1Title', bodyKey: 'onboarding.slide1Body', color: '#EEF2FF' },
  { icon: 'chart-line' as const, titleKey: 'onboarding.slide2Title', bodyKey: 'onboarding.slide2Body', color: '#ECFDF5' },
  { icon: 'school' as const, titleKey: 'onboarding.slide3Title', bodyKey: 'onboarding.slide3Body', color: '#FFFBEB' },
  { icon: 'rocket-launch' as const, titleKey: 'onboarding.slide4Title', bodyKey: 'onboarding.slide4Body', color: '#F5F3FF' },
]

interface OnboardingScreenProps {
  onComplete: () => void
}

export async function isOnboardingComplete(): Promise<boolean> {
  const local = await AsyncStorage.getItem(ONBOARDING_KEY)
  return local === 'true'
}

export async function markOnboardingComplete(): Promise<void> {
  await AsyncStorage.setItem(ONBOARDING_KEY, 'true')
  try {
    await authApi.updateProfile({ onboarding_completed: true })
  } catch {
    // offline or guest — local flag is enough
  }
}

export default function OnboardingScreen({ onComplete }: OnboardingScreenProps) {
  const { t } = useI18n()
  const [index, setIndex] = useState(0)
  const [showSetup, setShowSetup] = useState(false)
  const listRef = useRef<FlatList>(null)

  const finish = async () => {
    await markOnboardingComplete()
    onComplete()
  }

  const goToSetup = () => setShowSetup(true)

  if (showSetup) {
    return <OnboardingSetupScreen onComplete={finish} />
  }

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const i = Math.round(e.nativeEvent.contentOffset.x / width)
    setIndex(i)
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.topBar}>
        <Button mode="text" onPress={finish}>
          {t('onboarding.skip')}
        </Button>
      </View>
      <FlatList
        ref={listRef}
        data={SLIDES}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={onScroll}
        keyExtractor={(_, i) => String(i)}
        renderItem={({ item }) => (
          <View style={[styles.slide, { width }]}>
            <View style={[styles.iconCircle, { backgroundColor: item.color }]}>
              <MaterialCommunityIcons name={item.icon} size={56} color={colors.brand.primary} />
            </View>
            <Text variant="headlineMedium" style={styles.title}>
              {t(item.titleKey)}
            </Text>
            <Text variant="bodyLarge" style={styles.body}>
              {t(item.bodyKey)}
            </Text>
          </View>
        )}
      />
      <View style={styles.dots}>
        {SLIDES.map((_, i) => (
          <View key={i} style={[styles.dot, i === index && styles.dotActive]} />
        ))}
      </View>
      <View style={styles.footer}>
        {index < SLIDES.length - 1 ? (
          <Button
            mode="contained"
            onPress={() => listRef.current?.scrollToIndex({ index: index + 1 })}
            style={styles.btn}
          >
            {t('onboarding.next')}
          </Button>
        ) : (
          <Button mode="contained" onPress={goToSetup} style={styles.btn}>
            {t('onboarding.start')}
          </Button>
        )}
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background.paper },
  topBar: { alignItems: 'flex-end', paddingHorizontal: spacing.sm },
  slide: { paddingHorizontal: spacing.xl, alignItems: 'center', justifyContent: 'center' },
  iconCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xl,
  },
  title: { fontWeight: '700', textAlign: 'center', color: colors.text.primary, marginBottom: spacing.md },
  body: { textAlign: 'center', color: colors.text.secondary, lineHeight: 24 },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 8, marginVertical: spacing.md },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.border.medium },
  dotActive: { width: 24, backgroundColor: colors.brand.primary },
  footer: { padding: spacing.lg },
  btn: { borderRadius: 14 },
})
