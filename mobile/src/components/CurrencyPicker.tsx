import React, { useMemo, useState } from 'react'
import {
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native'
import { Menu, Text, TouchableRipple } from 'react-native-paper'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { useCurrency } from '../contexts/CurrencyContext'
import { useI18n } from '../contexts/I18nContext'
import { colors, radius, spacing, typography } from '../theme'
import type { CurrencyCode } from '../utils/currency'

type Props = {
  value: CurrencyCode | string
  onChange: (code: CurrencyCode) => void
  label?: string
  /** Compact style for inline amount rows */
  dense?: boolean
  disabled?: boolean
  /** Show code + translated name on the trigger (Global FX). */
  showName?: boolean
  /** Searchable full-screen picker — use when the list can grow. */
  searchable?: boolean
}

/**
 * Currency selector for every money entry form.
 * Always stores the selected code with the amount — never assumes a single app currency.
 */
export default function CurrencyPicker({
  value,
  onChange,
  label,
  dense,
  disabled,
  showName,
  searchable,
}: Props) {
  const { currencies, currencyLabel } = useCurrency()
  const { t } = useI18n()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const code = (value || 'USD').toUpperCase() as CurrencyCode

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return [...currencies]
    return currencies.filter((c) => currencyLabel(c).toLowerCase().includes(q) || c.toLowerCase().includes(q))
  }, [currencies, currencyLabel, query])

  const triggerLabel = showName ? currencyLabel(code) : code

  if (!searchable) {
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
                <Text style={styles.code} numberOfLines={1}>
                  {triggerLabel}
                </Text>
                <MaterialCommunityIcons name="chevron-down" size={18} color={colors.text.muted} />
              </View>
            </TouchableRipple>
          }
        >
          <Menu.Item onPress={() => {}} title={label || t('market.selectCurrency')} disabled />
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

  return (
    <View style={[styles.wrap, dense && styles.wrapDense, styles.wrapFlex]}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <TouchableRipple
        disabled={disabled}
        onPress={() => {
          setQuery('')
          setOpen(true)
        }}
        style={[styles.anchor, dense && styles.anchorDense, disabled && styles.disabled]}
        borderless={false}
      >
        <View style={styles.row}>
          <Text style={styles.code} numberOfLines={2}>
            {triggerLabel}
          </Text>
          <MaterialCommunityIcons name="chevron-down" size={18} color={colors.text.muted} />
        </View>
      </TouchableRipple>
      <Modal visible={open} animationType="slide" transparent onRequestClose={() => setOpen(false)}>
        <View style={styles.modalRoot}>
          <Pressable style={styles.backdrop} onPress={() => setOpen(false)} />
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>{label || t('market.selectCurrency')}</Text>
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder={t('market.searchCurrency')}
              placeholderTextColor={colors.text.muted}
              style={styles.search}
              autoCorrect={false}
              autoCapitalize="characters"
            />
            <FlatList
              data={filtered}
              keyExtractor={(item) => item}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => (
                <TouchableRipple
                  onPress={() => {
                    onChange(item)
                    setOpen(false)
                  }}
                  style={styles.option}
                >
                  <View style={styles.optionRow}>
                    <Text style={styles.optionText}>{currencyLabel(item)}</Text>
                    {item === code ? (
                      <MaterialCommunityIcons name="check" size={20} color={colors.brand.primary} />
                    ) : null}
                  </View>
                </TouchableRipple>
              )}
              ListEmptyComponent={<Text style={styles.empty}>{t('market.noCurrencyMatch')}</Text>}
            />
          </View>
        </View>
      </Modal>
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: { marginBottom: spacing.sm },
  wrapFlex: { flex: 1 },
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
    flex: 1,
  },
  disabled: { opacity: 0.5 },
  modalRoot: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(5,5,11,0.45)' },
  sheet: {
    maxHeight: '75%',
    backgroundColor: colors.background.paper,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    padding: spacing.md,
    paddingBottom: spacing.xl,
  },
  sheetTitle: { ...typography.h3, color: colors.text.primary, marginBottom: spacing.sm },
  search: {
    borderWidth: 1,
    borderColor: colors.border.light,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    color: colors.text.primary,
    marginBottom: spacing.sm,
  },
  option: { paddingVertical: spacing.sm, paddingHorizontal: spacing.xs },
  optionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  optionText: { ...typography.body, color: colors.text.primary, flex: 1, paddingRight: spacing.sm },
  empty: { ...typography.body, color: colors.text.muted, textAlign: 'center', padding: spacing.md },
})
