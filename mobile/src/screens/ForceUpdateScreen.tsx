import React, { useEffect } from 'react'
import { BackHandler, Linking, StyleSheet, View } from 'react-native'
import { Button, Text } from 'react-native-paper'
import { SafeAreaView } from 'react-native-safe-area-context'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { useI18n } from '../contexts/I18nContext'
import { colors, spacing, typography } from '../theme'
import type { ForceUpdateInfo } from '../utils/storeUpdate'

type Props = {
  info: ForceUpdateInfo
}

export default function ForceUpdateScreen({ info }: Props) {
  const { t } = useI18n()

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => true)
    return () => sub.remove()
  }, [])

  return (
    <SafeAreaView style={styles.wrap}>
      <View style={styles.card}>
        <MaterialCommunityIcons name="cellphone-arrow-down" size={56} color={colors.brand.primary} />
        <Text style={styles.title}>{t('forceUpdate.title')}</Text>
        <Text style={styles.body}>{info.message || t('forceUpdate.body')}</Text>
        <Button
          mode="contained"
          onPress={() => {
            Linking.openURL(info.storeUrl).catch(() => {})
          }}
          style={styles.button}
        >
          {t('forceUpdate.update')}
        </Button>
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    backgroundColor: colors.background.default,
    justifyContent: 'center',
    padding: spacing.lg,
  },
  card: {
    alignItems: 'center',
    gap: spacing.md,
  },
  title: {
    ...typography.h2,
    textAlign: 'center',
  },
  body: {
    ...typography.body,
    textAlign: 'center',
    color: colors.text.secondary,
  },
  button: {
    marginTop: spacing.sm,
    alignSelf: 'stretch',
  },
})
