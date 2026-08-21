import React, { useCallback, useState } from 'react'
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native'
import { Card, Text } from 'react-native-paper'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useFocusEffect } from '@react-navigation/native'
import { instructorsApi } from '../services/api'
import { useI18n } from '../contexts/I18nContext'
import { getApiErrorMessage } from '../types/api'
import { ZendaLoading } from '../components/ui/ZendaLoader'
import { colors } from '../theme'

interface Dash {
  students: number
  courses: number
  published: number
  drafts: number
  rating: string
  earnings: { total_sales: string; available: string; currency: string }
}

export default function InstructorDashboardScreen() {
  const { t } = useI18n()
  const [data, setData] = useState<Dash | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setError('')
    try {
      const res = await instructorsApi.dashboard() as Dash
      setData(res)
    } catch (err) {
      setError(getApiErrorMessage(err, t('education.enrollFailed')))
    } finally {
      setLoading(false)
    }
  }, [t])

  useFocusEffect(
    useCallback(() => {
      void load()
    }, [load]),
  )

  if (loading && !data) {
    return (
      <SafeAreaView style={styles.safe}>
        <ZendaLoading message={t('education.loading')} />
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView refreshControl={<RefreshControl refreshing={loading} onRefresh={() => void load()} />}>
        <Text variant="headlineSmall" style={styles.title}>{t('education.instructorDash')}</Text>
        {error ? <Text style={styles.error}>{error}</Text> : null}
        {data ? (
          <View style={styles.grid}>
            <Card style={styles.card}><Card.Content>
              <Text variant="bodySmall">{t('education.statCourses')}</Text>
              <Text variant="headlineMedium">{data.courses}</Text>
            </Card.Content></Card>
            <Card style={styles.card}><Card.Content>
              <Text variant="bodySmall">{t('education.statCompleted')}</Text>
              <Text variant="headlineMedium">{data.students}</Text>
            </Card.Content></Card>
            <Card style={styles.card}><Card.Content>
              <Text variant="bodySmall">{t('education.pointsAvailable')}</Text>
              <Text variant="headlineMedium">{data.earnings.currency} {data.earnings.available}</Text>
            </Card.Content></Card>
            <Card style={styles.card}><Card.Content>
              <Text variant="bodySmall">{t('education.published')}</Text>
              <Text variant="headlineMedium">{data.published}</Text>
            </Card.Content></Card>
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg.page },
  title: { margin: 16, color: colors.brand.navy, fontWeight: '700' },
  error: { marginHorizontal: 16, color: colors.feedback.expense },
  grid: { padding: 12, gap: 12 },
  card: { borderRadius: 16 },
})
