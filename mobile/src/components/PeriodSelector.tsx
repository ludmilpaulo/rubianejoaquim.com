/**
 * Reusable period selector for analytics: daily, monthly, yearly, custom.
 * When custom is selected, shows date range pickers.
 */
import React, { useState } from 'react'
import { View, StyleSheet } from 'react-native'
import { SegmentedButtons, Menu, Chip } from 'react-native-paper'
import DatePicker from './DatePicker'
import { useI18n } from '../contexts/I18nContext'
import { formatDate as formatLocaleDate } from '../i18n/format'
import type { Locale } from '../i18n'
import type { Messages } from '../i18n'

export type PeriodType = 'daily' | 'monthly' | 'yearly' | 'custom'

export interface PeriodState {
  period: PeriodType
  month: number
  year: number
  dateFrom: Date | null
  dateTo: Date | null
  dailyDate?: Date | null  // For daily period, allow selecting a specific date
}

export function getDefaultPeriod(): PeriodState {
  const now = new Date()
  return {
    period: 'monthly',
    month: now.getMonth() + 1,
    year: now.getFullYear(),
    dateFrom: null,
    dateTo: null,
  }
}

export function getPeriodParams(state: PeriodState): Record<string, string | number> {
  const now = new Date()
  const params: Record<string, string | number> = { period: state.period }
  if (state.period === 'daily') {
    const dailyDate = state.dailyDate || now
    params.date_from = dailyDate.toISOString().split('T')[0]
    params.date_to = dailyDate.toISOString().split('T')[0]
    params.month = dailyDate.getMonth() + 1
    params.year = dailyDate.getFullYear()
  } else if (state.period === 'monthly') {
    params.month = state.month
    params.year = state.year
  } else if (state.period === 'yearly') {
    params.year = state.year
  } else if (state.period === 'custom' && state.dateFrom && state.dateTo) {
    params.date_from = state.dateFrom.toISOString().split('T')[0]
    params.date_to = state.dateTo.toISOString().split('T')[0]
  }
  return params
}

export function getPeriodLabel(state: PeriodState, locale: Locale, periodMessages: Messages['period']): string {
  if (state.period === 'daily') {
    const d = state.dailyDate || new Date()
    return formatLocaleDate(locale, d, { day: '2-digit', month: 'short', year: 'numeric' })
  }
  if (state.period === 'monthly') {
    const m = periodMessages.months[state.month] ?? String(state.month)
    return `${m} ${state.year}`
  }
  if (state.period === 'yearly') return String(state.year)
  if (state.period === 'custom' && state.dateFrom && state.dateTo) {
    return `${formatLocaleDate(locale, state.dateFrom)} - ${formatLocaleDate(locale, state.dateTo)}`
  }
  return periodMessages.label
}

interface PeriodSelectorProps {
  state: PeriodState
  onChange: (state: PeriodState) => void
  showCustom?: boolean
  compact?: boolean
}

export default function PeriodSelector({ state, onChange, showCustom = true, compact }: PeriodSelectorProps) {
  const { t, locale, messages } = useI18n()
  const [showMonthMenu, setShowMonthMenu] = useState(false)
  const [showYearMenu, setShowYearMenu] = useState(false)

  const months = messages.period.monthNames
  const currentYear = new Date().getFullYear()
  const years = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i)

  const handlePeriodChange = (value: string) => {
    const period = value as PeriodType
    const now = new Date()
    onChange({
      ...state,
      period,
      month: now.getMonth() + 1,
      year: now.getFullYear(),
      dateFrom: period === 'custom' ? now : null,
      dateTo: period === 'custom' ? now : null,
    })
  }

  return (
    <View style={[styles.container, compact && styles.compact]}>
      <SegmentedButtons
        value={state.period}
        onValueChange={handlePeriodChange}
        buttons={[
          { value: 'daily', label: t('period.daily'), icon: 'calendar-today' },
          { value: 'monthly', label: t('period.monthly'), icon: 'calendar-month' },
          { value: 'yearly', label: t('period.yearly'), icon: 'calendar' },
          ...(showCustom ? [{ value: 'custom' as const, label: t('period.custom'), icon: 'calendar-range' as const }] : []),
        ]}
        style={styles.segmented}
      />
      {state.period === 'monthly' && (
        <View style={styles.row}>
          <Menu
            visible={showMonthMenu}
            onDismiss={() => setShowMonthMenu(false)}
            anchor={
              <Chip
                onPress={() => setShowMonthMenu(true)}
                icon="calendar-month"
                style={styles.chip}
              >
                {months[state.month - 1]}
              </Chip>
            }
          >
            {months.map((m, i) => (
              <Menu.Item
                key={m}
                onPress={() => {
                  onChange({ ...state, month: i + 1 })
                  setShowMonthMenu(false)
                }}
                title={m}
              />
            ))}
          </Menu>
          <Menu
            visible={showYearMenu}
            onDismiss={() => setShowYearMenu(false)}
            anchor={
              <Chip
                onPress={() => setShowYearMenu(true)}
                icon="calendar"
                style={styles.chip}
              >
                {state.year}
              </Chip>
            }
          >
            {years.map((y) => (
              <Menu.Item
                key={y}
                onPress={() => {
                  onChange({ ...state, year: y })
                  setShowYearMenu(false)
                }}
                title={String(y)}
              />
            ))}
          </Menu>
        </View>
      )}
      {state.period === 'daily' && (
        <View style={styles.row}>
          <DatePicker
            label={t('period.date')}
            value={state.dailyDate || new Date()}
            onChange={(d) => onChange({ ...state, dailyDate: d || new Date() })}
          />
        </View>
      )}
      {state.period === 'yearly' && (
        <Menu
          visible={showYearMenu}
          onDismiss={() => setShowYearMenu(false)}
          anchor={
            <Chip
              onPress={() => setShowYearMenu(true)}
              icon="calendar"
              style={styles.chip}
            >
              {state.year}
            </Chip>
          }
        >
          {years.map((y) => (
            <Menu.Item
              key={y}
              onPress={() => {
                onChange({ ...state, year: y })
                setShowYearMenu(false)
              }}
              title={String(y)}
            />
          ))}
        </Menu>
      )}
      {state.period === 'custom' && (
        <View style={styles.row}>
          <DatePicker
            label={t('period.from')}
            value={state.dateFrom || new Date()}
            onChange={(d) => onChange({ ...state, dateFrom: d || new Date() })}
          />
          <DatePicker
            label={t('period.to')}
            value={state.dateTo || new Date()}
            onChange={(d) => onChange({ ...state, dateTo: d || new Date() })}
          />
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 12,
  },
  compact: {
    marginBottom: 8,
  },
  segmented: {
    marginBottom: 8,
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
  },
  chip: {
    marginRight: 4,
  },
})
