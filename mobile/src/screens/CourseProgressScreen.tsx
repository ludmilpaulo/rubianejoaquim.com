import React, { useState, useEffect } from 'react'
import { View, StyleSheet, ScrollView, TouchableOpacity, Linking } from 'react-native'
import { Text, Card, Button } from 'react-native-paper'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRoute, useNavigation, useFocusEffect } from '@react-navigation/native'
import { coursesApi } from '../services/api'
import { unwrapEnvelope } from '../types/api'
import { logger } from '../utils/logger'

const WEB_APP_URL = process.env.EXPO_PUBLIC_WEB_APP_URL || 'https://rubianejoaquim.com'

interface QuizResultItem {
  lesson_id: number
  lesson_title: string
  quiz_id: number
  quiz_title: string
  score: number | null
  passed: boolean
  total_questions: number
  correct_answers: number
  passing_score: number
  completed_at: string | null
}

interface CourseProgressData {
  course_id: number
  course_title: string
  quiz_results: QuizResultItem[]
  total_quizzes: number
  completed_quizzes: number
  average_score: number
  passing_average: number
  course_passed: boolean
  enrollment_status: string
}

interface RouteParams {
  courseId: number
  enrollmentId: number
}

export default function CourseProgressScreen() {
  const route = useRoute()
  const navigation = useNavigation<any>()
  const { courseId, enrollmentId } = (route.params as RouteParams) || {}
  const [progress, setProgress] = useState<CourseProgressData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (enrollmentId) loadProgress()
  }, [enrollmentId])

  useFocusEffect(
    React.useCallback(() => {
      if (enrollmentId) loadProgress()
    }, [enrollmentId])
  )

  const loadProgress = async () => {
    if (!enrollmentId) return
    try {
      setLoading(true)
      const data = await coursesApi.getQuizResults(enrollmentId)
      const payload = unwrapEnvelope(data)
      setProgress(payload && typeof payload.course_id !== 'undefined' ? payload : null)
    } catch (error) {
      logger.error('Error loading progress:', error)
      setProgress(null)
    } finally {
      setLoading(false)
    }
  }

  const openLesson = (lessonId: number) => {
    navigation.navigate('LessonDetail', { lessonId })
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.centered}>
          <Text variant="bodyLarge">Carregando progresso...</Text>
        </View>
      </SafeAreaView>
    )
  }

  if (!progress) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.centered}>
          <Text variant="bodyMedium" style={styles.errorText}>Progresso não encontrado.</Text>
          <Button mode="contained" onPress={() => navigation.goBack()}>Voltar</Button>
        </View>
      </SafeAreaView>
    )
  }

  const completionPct = progress.total_quizzes > 0
    ? (progress.completed_quizzes / progress.total_quizzes) * 100
    : 0

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        <Text variant="titleMedium" style={styles.sectionTitle}>
          {progress.course_title}
        </Text>
        <Text variant="bodySmall" style={styles.sectionSubtitle}>
          Acompanhe seu progresso e resultados dos quizzes
        </Text>

        <View style={styles.statsRow}>
          <Card style={styles.statCard}>
            <Card.Content>
              <MaterialCommunityIcons name="chart-line" size={28} color="#6366f1" />
              <Text variant="titleMedium" style={styles.statValue}>
                {progress.average_score.toFixed(1)}%
              </Text>
              <Text variant="bodySmall" style={styles.statLabel}>Média</Text>
            </Card.Content>
          </Card>
          <Card style={styles.statCard}>
            <Card.Content>
              <MaterialCommunityIcons name="file-question" size={28} color="#6366f1" />
              <Text variant="titleMedium" style={styles.statValue}>
                {progress.completed_quizzes}/{progress.total_quizzes}
              </Text>
              <Text variant="bodySmall" style={styles.statLabel}>Quizzes</Text>
            </Card.Content>
          </Card>
          <Card style={[styles.statCard, progress.course_passed ? styles.passedCard : styles.failedCard]}>
            <Card.Content>
              <MaterialCommunityIcons
                name={progress.course_passed ? 'trophy' : 'close-circle'}
                size={28}
                color={progress.course_passed ? '#10b981' : '#ef4444'}
              />
              <Text variant="titleSmall" style={styles.statLabel}>
                {progress.course_passed ? 'Aprovado' : 'Em curso'}
              </Text>
            </Card.Content>
          </Card>
        </View>

        <View style={styles.progressBarContainer}>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${completionPct}%` }]} />
          </View>
          <Text variant="bodySmall" style={styles.progressPct}>
            {completionPct.toFixed(0)}% completo
          </Text>
        </View>

        <Text variant="titleSmall" style={styles.listTitle}>
          Resultados por aula
        </Text>
        {(progress.quiz_results ?? []).length === 0 ? (
          <Card style={styles.card}>
            <Card.Content>
              <Text variant="bodyMedium" style={styles.emptyText}>
                Nenhum quiz neste curso.
              </Text>
            </Card.Content>
          </Card>
        ) : (
          (progress.quiz_results ?? []).map((r, index) => (
            <Card key={r.quiz_id} style={styles.resultCard}>
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => openLesson(r.lesson_id)}
              >
                <Card.Content>
                  <View style={styles.resultHeader}>
                    <View style={styles.resultIndex}>
                      <Text variant="labelMedium" style={styles.resultIndexText}>
                        {index + 1}
                      </Text>
                    </View>
                    <View style={styles.resultBody}>
                      <Text variant="titleSmall" style={styles.lessonTitle}>
                        {r.lesson_title}
                      </Text>
                      <Text variant="bodySmall" style={styles.quizTitle}>
                        {r.quiz_title}
                      </Text>
                      {r.score !== null ? (
                        <View style={styles.resultMeta}>
                          <Text
                            variant="labelMedium"
                            style={[
                              styles.scoreBadge,
                              r.passed ? styles.scorePassed : styles.scoreFailed,
                            ]}
                          >
                            {r.score.toFixed(0)}%
                          </Text>
                          <Text variant="bodySmall" style={styles.metaText}>
                            {r.correct_answers}/{r.total_questions} corretas
                          </Text>
                          {r.passed ? (
                            <MaterialCommunityIcons name="check-circle" size={18} color="#10b981" />
                          ) : (
                            <MaterialCommunityIcons name="close-circle" size={18} color="#ef4444" />
                          )}
                        </View>
                      ) : (
                        <Text variant="bodySmall" style={styles.notDone}>
                          Quiz não realizado
                        </Text>
                      )}
                    </View>
                    <MaterialCommunityIcons name="chevron-right" size={24} color="#9ca3af" />
                  </View>
                </Card.Content>
              </TouchableOpacity>
            </Card>
          ))
        )}

        <Button
          mode="outlined"
          icon="certificate"
          onPress={() => Linking.openURL(`${WEB_APP_URL}/certificado/${enrollmentId}`)}
          style={styles.certificateButton}
        >
          Ver certificado (abre no browser)
        </Button>

        <Button
          mode="outlined"
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          Voltar às aulas
        </Button>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#f5f5f5' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  errorText: { color: '#666', marginBottom: 16 },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 32 },
  sectionTitle: { fontWeight: '700', color: '#1f2937', marginBottom: 4 },
  sectionSubtitle: { color: '#666', marginBottom: 16 },
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  statCard: {
    flex: 1,
    borderRadius: 12,
    elevation: 2,
  },
  passedCard: { backgroundColor: '#f0fdf4', borderWidth: 1, borderColor: '#10b981' },
  failedCard: { backgroundColor: '#fef2f2', borderWidth: 1, borderColor: '#ef4444' },
  statValue: { fontWeight: '700', color: '#1f2937', marginTop: 4 },
  statLabel: { color: '#666', marginTop: 2 },
  progressBarContainer: { marginBottom: 20 },
  progressBar: { height: 8, backgroundColor: '#e5e7eb', borderRadius: 4, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: '#6366f1', borderRadius: 4 },
  progressPct: { color: '#666', marginTop: 4 },
  listTitle: { fontWeight: '600', color: '#374151', marginBottom: 12 },
  card: { marginBottom: 12, borderRadius: 12, elevation: 2 },
  emptyText: { color: '#666', textAlign: 'center' },
  resultCard: { marginBottom: 10, borderRadius: 12, elevation: 2 },
  resultHeader: { flexDirection: 'row', alignItems: 'center' },
  resultIndex: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#eef2ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  resultIndexText: { color: '#6366f1', fontWeight: '700' },
  resultBody: { flex: 1 },
  lessonTitle: { fontWeight: '600', color: '#1f2937' },
  quizTitle: { color: '#666', marginTop: 2 },
  resultMeta: { flexDirection: 'row', alignItems: 'center', marginTop: 6, gap: 8 },
  scoreBadge: { fontWeight: '700' },
  scorePassed: { color: '#10b981' },
  scoreFailed: { color: '#ef4444' },
  metaText: { color: '#666' },
  notDone: { color: '#9ca3af', fontStyle: 'italic', marginTop: 4 },
  certificateButton: { marginTop: 8 },
  backButton: { marginTop: 16 },
})
