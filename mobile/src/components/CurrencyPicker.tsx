import React, { useState } from 'react'
import { StyleSheet, View } from 'react-native'
import { Menu, Text, TouchableRipple } from 'react-native-paper'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { useCurrency } from '../contexts/CurrencyContext'
import { useI18n } from '../contexts/I18nContext'
import { colors, radius, spacing } from '../theme'
import type { CurrencyCode } from '../utils/currency'

type Props = {
  value: CurrencyCode | string
  onChange: (code: CurrencyCode) => void
  label?: string
  /** Compact style for inline amount rows */
  dense?: boolean
  disabled?: boolean
}

/**
 * Currency selector for every money entry form.
 * Always stores the selected code with the amount — never assumes a single app currency.
 */
export default function CurrencyPicker({ value, onChange, label, dense, disabled }: Props) {
  const { currencies, currencyLabel } = useCurrency()
  const { t } = useI18n()
  const [open, setOpen] = useState(false)
  const code = (value || 'USD').toUpperCase() as CurrencyCode

  return (
    <View style={[styles.wrap, dense && styles.wrapDense]}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <Menu
        visible={open}
        onDismiss={() => setOpen(false)}
        anchor={
          <TouchableRipple
            disabled={disabled}
            onPress={() => setOpen(true)}
            style={[styles.anchor, dense && styles.anchorDense, disabled && styles.disabled]}
            borderless={false}
          >
            <View style={styles.row}>
              <Text style={styles.code}>{code}</Text>
              <MaterialCommunityIcons name="chevron-down" size={18} color={colors.text.muted} />
            </View>
          </TouchableRipple>
        }
      >
        <Menu.Item
          onPress={() => {}}
          title={label || t('market.selectCurrency')}
          disabled
        />
        {currencies.map((c) => (
          <Menu.Item
            key={c}
            onPress={() => {
              onChange(c)
              setOpen(false)
            }}
            title={currencyLabel(c)}
            leadingIcon={c === code ? 'check' : undefined}
          />
        ))}
      </Menu>
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: { marginBottom: spacing.sm },
  wrapDense: { marginBottom: 0, minWidth: 88 },
  label: {
    fontSize: 12,
    color: colors.text.muted,
    marginBottom: 4,
  },
  anchor: {
    borderWidth: 1,
    borderColor: colors.border.light,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    backgroundColor: colors.surface,
  },
  anchorDense: {
    paddingVertical: 10,
    paddingHorizontal: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 4,
  },
  code: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text.primary,
  },
  disabled: { opacity: 0.5 },
})
