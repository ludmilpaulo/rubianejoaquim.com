import React, { useState } from 'react'
import { View, StyleSheet, Platform, TouchableOpacity, type StyleProp, type ViewStyle } from 'react-native'
import type { DateTimePickerEvent } from '@react-native-community/datetimepicker'
import { Text, Button } from 'react-native-paper'
import DateTimePicker from '@react-native-community/datetimepicker'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { useI18n } from '../contexts/I18nContext'
import { formatDate as formatLocaleDate, formatTime as formatLocaleTime, getBcp47 } from '../i18n/format'

interface DatePickerProps {
  label: string
  value: Date | null
  onChange: (date: Date | null) => void
  mode?: 'date' | 'time' | 'datetime'
  minimumDate?: Date
  maximumDate?: Date
  style?: StyleProp<ViewStyle>
}

export default function DatePicker({
  label,
  value,
  onChange,
  mode = 'date',
  minimumDate,
  maximumDate,
  style,
}: DatePickerProps) {
  const { t, locale } = useI18n()
  const [show, setShow] = useState(false)

  const formatDate = (date: Date | null) => {
    if (!date) return mode === 'time' ? t('common.selectTime') : t('common.selectDate')
    
    if (mode === 'time') {
      return formatLocaleTime(locale, date, { hour: '2-digit', minute: '2-digit' })
    } else if (mode === 'datetime') {
      return formatLocaleDate(locale, date, {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    } else {
      return formatLocaleDate(locale, date, {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      })
    }
  }

  const handleChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShow(false)
    }
    
    if (event.type === 'set' && selectedDate) {
      onChange(selectedDate)
      if (Platform.OS === 'ios') {
        setShow(false)
      }
    } else if (event.type === 'dismissed') {
      setShow(false)
    }
  }

  return (
    <View style={[styles.container, style]}>
      <Text variant="bodySmall" style={styles.label}>
        {label}
      </Text>
      <TouchableOpacity
        style={styles.pickerButton}
        onPress={() => setShow(true)}
        activeOpacity={0.7}
      >
        <View style={styles.pickerContent}>
          <MaterialCommunityIcons
            name={mode === 'time' ? 'clock-outline' : 'calendar'}
            size={20}
            color="#3534C9"
            style={styles.icon}
          />
          <Text
            variant="bodyLarge"
            style={[styles.pickerText, !value && styles.placeholderText]}
          >
            {formatDate(value)}
          </Text>
        </View>
        <MaterialCommunityIcons name="chevron-down" size={20} color="#999" />
      </TouchableOpacity>

      {show && (
        <>
          {Platform.OS === 'ios' && (
            <View style={styles.iosButtons}>
              <Button onPress={() => setShow(false)}>{t('common.cancel')}</Button>
              <Button
                mode="contained"
                onPress={() => {
                  if (value) {
                    onChange(value)
                  }
                  setShow(false)
                }}
              >
                {t('common.confirm')}
              </Button>
            </View>
          )}
          <DateTimePicker
            value={value || new Date()}
            mode={mode}
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={handleChange}
            minimumDate={minimumDate}
            maximumDate={maximumDate}
            locale={getBcp47(locale)}
          />
        </>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  label: {
    marginBottom: 8,
    color: '#666',
    fontWeight: '500',
  },
  pickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    minHeight: 56,
  },
  pickerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  icon: {
    marginRight: 12,
  },
  pickerText: {
    flex: 1,
    color: '#1f2937',
  },
  placeholderText: {
    color: '#999',
  },
  iosButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 8,
    gap: 8,
  },
})
