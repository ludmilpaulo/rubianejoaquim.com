/**
 * Reusable period selector for analytics: daily, monthly, yearly, custom.
 * When custom is selected, shows date range pickers.
 */
import React, { useState } from 'react'
import { View, StyleSheet } from 'react-native'
import { SegmentedButtons, Menu, Text, Chip } from 'react-native-paper'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import DatePicker from './DatePicker'

export type PeriodType = 'daily' | 'monthly' | 'yearly' | 'custom'

export interface PeriodState {
  period: PeriodType
  month: number
  year: number
  dateFrom: Date | null
  dateTo: Date | null
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
    params.month = now.getMonth() + 1
    params.year = now.getFullYear()
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

export function getPeriodLabel(state: PeriodState): string {
  if (state.period === 'daily') {
    const d = new Date()
    return d.toLocaleDateString('pt-PT', { day: '2-digit', month: 'short', year: 'numeric' })
  }
  if (state.period === 'monthly') {
    const m = ['', 'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'][state.month]
    return `${m} ${state.year}`
  }
  if (state.period === 'yearly') return String(state.year)
  if (state.period === 'custom' && state.dateFrom && state.dateTo) {
    return `${state.dateFrom.toLocaleDateString('pt-PT')} - ${state.dateTo.toLocaleDateString('pt-PT')}`
  }
  return 'Período'
}

interface PeriodSelectorProps {
  state: PeriodState
  onChange: (state: PeriodState) => void
  showCustom?: boolean
  compact?: boolean
}

export default function PeriodSelector({ state, onChange, showCustom = true, compact }: PeriodSelectorProps) {
  const [showMonthMenu, setShowMonthMenu] = useState(false)
  const [showYearMenu, setShowYearMenu] = useState(false)

  const months = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
  ]
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
          { value: 'daily', label: 'Diário', icon: 'calendar-today' },
          { value: 'monthly', label: 'Mensal', icon: 'calendar-month' },
          { value: 'yearly', label: 'Anual', icon: 'calendar' },
          ...(showCustom ? [{ value: 'custom' as const, label: 'Custom', icon: 'calendar-range' as const }] : []),
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
            label="De"
            value={state.dateFrom || new Date()}
            onChange={(d) => onChange({ ...state, dateFrom: d || new Date() })}
          />
          <DatePicker
            label="Até"
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
