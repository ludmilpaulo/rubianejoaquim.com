import React from 'react'
import { StyleSheet, View } from 'react-native'
import { Text } from 'react-native-paper'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { colors, radius, spacing, typography } from '../../theme'
import ZendaButton from './ZendaButton'

interface ErrorStateProps {
  title: string
  description?: string
  retryLabel?: string
  onRetry?: () => void
}

export default function ErrorState({
  title,
  description,
  retryLabel,
  onRetry,
}: ErrorStateProps) {
  return (
    <View style={styles.wrap}>
      <View style={styles.iconCircle}>
        <MaterialCommunityIcons name="alert-circle-outline" size={40} color={colors.semantic.error} />
      </View>
      <Text style={styles.title}>{title}</Text>
      {description ? <Text style={styles.desc}>{description}</Text> : null}
      {retryLabel && onRetry ? (
        <ZendaButton variant="primary" onPress={onRetry} style={styles.btn}>
          {retryLabel}
        </ZendaButton>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', padding: spacing.xl },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FDECEA',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  title: { ...typography.h3, color: colors.text.primary, textAlign: 'center', flexShrink: 1 },
  desc: {
    ...typography.body,
    color: colors.text.secondary,
    textAlign: 'center',
    marginTop: spacing.sm,
    flexShrink: 1,
  },
  btn: { marginTop: spacing.lg, borderRadius: radius.md },
})
