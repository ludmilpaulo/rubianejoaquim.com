import React from 'react'
import { StyleSheet, type StyleProp, type ViewStyle } from 'react-native'
import { Button, type ButtonProps } from 'react-native-paper'
import { colors, radius, spacing } from '../../theme'

type Variant = 'primary' | 'secondary' | 'growth' | 'outline' | 'ghost' | 'danger'

interface ZendaButtonProps extends Omit<ButtonProps, 'mode' | 'buttonColor' | 'textColor'> {
  variant?: Variant
  style?: StyleProp<ViewStyle>
}

const VARIANT: Record<
  Variant,
  { mode: ButtonProps['mode']; buttonColor?: string; textColor?: string }
> = {
  primary: { mode: 'contained', buttonColor: colors.brand.primary, textColor: '#FFFFFF' },
  secondary: { mode: 'contained-tonal', buttonColor: colors.brand.primaryContainer, textColor: colors.brand.primary },
  growth: { mode: 'contained', buttonColor: colors.brand.growth, textColor: '#FFFFFF' },
  outline: { mode: 'outlined', textColor: colors.brand.primary },
  ghost: { mode: 'text', textColor: colors.brand.primary },
  danger: { mode: 'contained', buttonColor: colors.brand.danger, textColor: '#FFFFFF' },
}

export default function ZendaButton({
  variant = 'primary',
  style,
  contentStyle,
  labelStyle,
  children,
  ...rest
}: ZendaButtonProps) {
  const v = VARIANT[variant]
  return (
    <Button
      mode={v.mode}
      buttonColor={v.buttonColor}
      textColor={v.textColor}
      style={[styles.btn, style]}
      contentStyle={[styles.content, contentStyle]}
      labelStyle={[styles.label, labelStyle]}
      {...rest}
    >
      {children}
    </Button>
  )
}

const styles = StyleSheet.create({
  btn: {
    borderRadius: radius.md,
  },
  content: {
    paddingVertical: spacing.xs,
    minHeight: 44,
  },
  label: {
    fontWeight: '700',
    letterSpacing: 0.2,
    flexShrink: 1,
  },
})
