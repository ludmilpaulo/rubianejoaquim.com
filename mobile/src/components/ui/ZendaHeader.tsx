import React, { type ReactNode } from 'react'
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native'
import { Text } from 'react-native-paper'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { colors, radius, spacing, typography } from '../../theme'
import ZendaLogo from './ZendaLogo'

interface ZendaHeaderProps {
  title: string
  subtitle?: string
  showLogo?: boolean
  right?: ReactNode
  onBack?: () => void
  style?: StyleProp<ViewStyle>
  /** Use brand gradient-like solid primary bar */
  solid?: boolean
}

export default function ZendaHeader({
  title,
  subtitle,
  showLogo = false,
  right,
  onBack,
  style,
  solid = true,
}: ZendaHeaderProps) {
  return (
    <View style={[styles.wrap, solid && styles.solid, style]}>
      <View style={styles.row}>
        {onBack ? (
          <MaterialCommunityIcons
            name="arrow-left"
            size={24}
            color={solid ? '#FFFFFF' : colors.brand.primary}
            onPress={onBack}
            style={styles.back}
          />
        ) : null}
        {showLogo ? <ZendaLogo size="small" style={styles.logo} /> : null}
        <View style={styles.textCol}>
          <Text style={[styles.title, solid && styles.titleOnPrimary]} numberOfLines={2}>
            {title}
          </Text>
          {subtitle ? (
            <Text style={[styles.subtitle, solid && styles.subtitleOnPrimary]} numberOfLines={2}>
              {subtitle}
            </Text>
          ) : null}
        </View>
        {right ? <View style={styles.right}>{right}</View> : null}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderBottomLeftRadius: radius.xl,
    borderBottomRightRadius: radius.xl,
  },
  solid: {
    backgroundColor: colors.brand.primary,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  back: {
    marginRight: spacing.xs,
  },
  logo: {
    marginRight: spacing.xs,
  },
  textCol: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    ...typography.h3,
    color: colors.text.primary,
    flexShrink: 1,
  },
  titleOnPrimary: {
    color: '#FFFFFF',
  },
  subtitle: {
    ...typography.caption,
    color: colors.text.secondary,
    marginTop: 2,
    flexShrink: 1,
  },
  subtitleOnPrimary: {
    color: 'rgba(255,255,255,0.85)',
  },
  right: {
    marginLeft: spacing.sm,
  },
})
