import React, { useState, useEffect } from 'react'
import { View, StyleSheet, ScrollView, RefreshControl, TouchableOpacity } from 'react-native'
import { Text, Card, ProgressBar, Chip, Button } from 'react-native-paper'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRoute, useNavigation } from '@react-navigation/native'
import { lessonsApi, coursesApi } from '../services/api'
import { useI18n } from '../contexts/I18nContext'
import { ZendaLoading } from '../components/ui/ZendaLoader'
import { getApiErrorMessage, unwrapList } from '../types/api'
import { logger } from '../utils/logger'
import { colors } from '../theme'

interface EnrollmentRow {
  id: number
  course: { id: number }
  status: string
}

interface Lesson {
  id: number
  title: string
  slug: string
  description: string
  duration: number | null
  is_free: boolean
  order: number
  progress?: {
    completed: boolean
    completed_at: string | null
  } | null
}

interface RouteParams {
  courseId: number
  enrollmentId: number
}

export default function CourseLessonsScreen() {
  const { t, tw } = useI18n()
  const route = useRoute()
  const navigation = useNavigation<any>()
  const { courseId, enrollmentId } = (route.params as RouteParams) || {}
  const [lessons, setLessons] = useState<Lesson[]>([])
  const [course, setCourse] = useState<any>(null)
  const [enrollment, setEnrollment] = useState<any>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  useEffect(() => {
    if (courseId) {
      loadData()
    }
  }, [courseId])

  const loadData = async () => {
    try {
      setLoading(true)
      setLoadError(null)
      const [lessonsRes, courseRes, enrollmentRes] = await Promise.all([
        lessonsApi.list(courseId),
        coursesApi.get(courseId),
        enrollmentId
          ? coursesApi.myEnrollments().then((res) => {
              const enrollments = unwrapList(res as EnrollmentRow[])
              return enrollments.find((e) => e.id === enrollmentId) ?? null
            })
          : Promise.resolve(null),
      ])
      
      // Handle lessons response
      let lessonsData: Lesson[] = []
      if (Array.isArray(lessonsRes)) {
        lessonsData = lessonsRes
      } else if (lessonsRes.results) {
        lessonsData = lessonsRes.results
      } else if (lessonsRes.data) {
        lessonsData = Array.isArray(lessonsRes.data) 
          ? lessonsRes.data 
          : lessonsRes.data.results || []
      }
      
      // Sort lessons by order
      setLessons(lessonsData.sort((a: Lesson, b: Lesson) => a.order - b.order))
      
      // Handle course response
      if (courseRes) {
        setCourse(Array.isArray(courseRes) ? courseRes[0] : courseRes)
      }
      
      setEnrollment(enrollmentRes)
    } catch (error) {
      logger.error('Error loading course lessons:', error)
      setLoadError(getApiErrorMessage(error, 'feedback.tryAgain'))
    } finally {
      setLoading(false)
    }
  }

  const onRefresh = async () => {
    setRefreshing(true)
    await loadData()
    setRefreshing(false)
  }

  const handleLessonPress = (lesson: Lesson) => {
    navigation.navigate('LessonDetail', { lessonId: lesson.id })
  }

  const completedLessons = lessons.filter(l => l.progress?.completed).length
  const totalLessons = lessons.length
  const progress = totalLessons > 0 ? (completedLessons / totalLessons) * 100 : 0

  if (loading && lessons.length === 0 && !course) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        {loadError ? (
          <View style={styles.centered}>
            <MaterialCommunityIcons name="alert-circle-outline" size={48} color={colors.danger} />
            <Text variant="bodyLarge" style={styles.errorText}>{loadError}</Text>
            <Button mode="contained" onPress={loadData}>{t('common.retry')}</Button>
          </View>
        ) : (
          <ZendaLoading visible fill message={t('loading.courses')} />
        )}
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView
        style={styles.container}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Course Header */}
        {course && (
          <Card style={styles.courseHeaderCard}>
            <Card.Content>
              <Text variant="headlineSmall" style={styles.courseTitle}>
                {course.title}
              </Text>
              {course.description && (
                <Text variant="bodyMedium" style={styles.courseDescription}>
                  {course.short_description || course.description}
                </Text>
              )}
              
              {/* Overall Progress */}
              {totalLessons > 0 && (
                <View style={styles.progressSection}>
                  <View style={styles.progressHeader}>
                    <Text variant="bodyMedium" style={styles.progressText}>
                      {tw('education.lessonsCompleted', { done: completedLessons, total: totalLessons })}
                    </Text>
                    <Text variant="bodyMedium" style={styles.progressPercentage}>
                      {progress.toFixed(0)}%
                    </Text>
                  </View>
                  <ProgressBar
                    progress={progress / 100}
                    color="#3534C9"
                    style={styles.progressBar}
                  />
                </View>
              )}
              {enrollmentId && (
                <Button
                  mode="outlined"
                  icon="chart-line"
                  onPress={() => navigation.navigate('CourseProgress', { courseId, enrollmentId })}
                  style={styles.progressButton}
                  compact
                >
                  {t('education.viewProgressQuizzes')}
                </Button>
              )}
            </Card.Content>
          </Card>
        )}

        {/* Lessons List */}
        <View style={styles.section}>
          <Text variant="titleMedium" style={styles.sectionTitle}>
            {t('education.courseLessonsTitle')}
          </Text>

          {lessons.length === 0 ? (
            <Card style={styles.card}>
              <Card.Content style={styles.emptyContent}>
                <MaterialCommunityIcons name="book-open-outline" size={64} color="#ccc" />
                <Text variant="bodyLarge" style={styles.emptyText}>
                  {t('education.noLessonsAvailable')}
                </Text>
              </Card.Content>
            </Card>
          ) : (
            lessons.map((lesson, index) => {
              const isCompleted = lesson.progress?.completed || false
              // In the Educação area, user should only access lessons for courses where they are enrolled.
              // Lock all lessons if there is no active enrollment for this course.
              const isLocked = !enrollment
              
              return (
                <TouchableOpacity
                  key={lesson.id}
                  onPress={() => !isLocked && handleLessonPress(lesson)}
                  activeOpacity={isLocked ? 1 : 0.7}
                  disabled={isLocked}
                >
                  <Card style={[
                    styles.lessonCard,
                    isCompleted && styles.lessonCardCompleted,
                    isLocked && styles.lessonCardLocked
                  ]}>
                    <Card.Content>
                      <View style={styles.lessonHeader}>
                        <View style={styles.lessonLeft}>
                          <View style={[
                            styles.lessonNumberContainer,
                            isCompleted && styles.lessonNumberCompleted,
                            isLocked && styles.lessonNumberLocked
                          ]}>
                            {isLocked ? (
                              <MaterialCommunityIcons name="lock" size={20} color="#999" />
                            ) : isCompleted ? (
                              <MaterialCommunityIcons name="check-circle" size={20} color="#fff" />
                            ) : (
                              <Text style={styles.lessonNumber}>{index + 1}</Text>
                            )}
                          </View>
                          <View style={styles.lessonInfo}>
                            <Text
                              variant="titleMedium"
                              style={[
                                styles.lessonTitle,
                                isCompleted && styles.lessonTitleCompleted,
                                isLocked && styles.lessonTitleLocked
                              ]}
                            >
                              {lesson.title}
                            </Text>
                            {lesson.description && (
                              <Text 
                                variant="bodySmall" 
                                style={[
                                  styles.lessonDescription,
                                  isLocked && styles.lessonDescriptionLocked
                                ]}
                                numberOfLines={2}
                              >
                                {lesson.description}
                              </Text>
                            )}
                            <View style={styles.lessonMeta}>
                              {lesson.duration && (
                                <View style={styles.lessonMetaItem}>
                                  <MaterialCommunityIcons name="clock-outline" size={14} color="#999" />
                                  <Text variant="bodySmall" style={styles.lessonMetaText}>
                                    {tw('education.minutesShort', { count: Math.floor(lesson.duration / 60) })}
                                  </Text>
                                </View>
                              )}
                              {lesson.is_free && (
                                <Chip
                                  icon="gift"
                                  style={styles.freeChip}
                                  textStyle={styles.freeChipText}
                                  compact
                                >
                                  {t('education.lessonFree')}
                                </Chip>
                              )}
                            </View>
                          </View>
                        </View>
                        {isCompleted && (
                          <Chip
                            icon="check-circle"
                            style={styles.completedChip}
                            textStyle={styles.completedChipText}
                            compact
                          >
                            {t('education.lessonDone')}
                          </Chip>
                        )}
                        {isLocked && (
                          <MaterialCommunityIcons name="lock" size={24} color="#ccc" />
                        )}
                      </View>
                    </Card.Content>
                  </Card>
                </TouchableOpacity>
              )
            })
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  container: {
    flex: 1,
  },
  courseHeaderCard: {
    margin: 16,
    borderRadius: 16,
    elevation: 4,
    backgroundColor: '#fff',
  },
  courseTitle: {
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 8,
  },
  courseDescription: {
    color: '#666',
    marginBottom: 16,
  },
  progressSection: {
    marginTop: 8,
  },
  progressButton: {
    marginTop: 12,
    borderColor: '#3534C9',
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  progressText: {
    fontWeight: '600',
    color: '#1f2937',
  },
  progressPercentage: {
    fontWeight: '600',
    color: '#3534C9',
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
  },
  section: {
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  sectionTitle: {
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 12,
  },
  card: {
    borderRadius: 12,
    elevation: 2,
  },
  emptyContent: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  emptyText: {
    marginTop: 16,
    color: '#999',
    textAlign: 'center',
  },
  lessonCard: {
    marginBottom: 12,
    borderRadius: 12,
    elevation: 2,
  },
  lessonCardCompleted: {
    borderLeftWidth: 4,
    borderLeftColor: '#4DB83D',
  },
  lessonCardLocked: {
    opacity: 0.6,
  },
  lessonHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  lessonLeft: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    flex: 1,
  },
  lessonNumberContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#eef2ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  lessonNumberCompleted: {
    backgroundColor: '#4DB83D',
  },
  lessonNumberLocked: {
    backgroundColor: '#f3f4f6',
  },
  lessonNumber: {
    fontWeight: 'bold',
    color: '#3534C9',
    fontSize: 16,
  },
  lessonInfo: {
    flex: 1,
  },
  lessonTitle: {
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
  },
  lessonTitleCompleted: {
    textDecorationLine: 'line-through',
    color: '#999',
  },
  lessonTitleLocked: {
    color: '#999',
  },
  lessonDescription: {
    color: '#666',
    marginBottom: 8,
  },
  lessonDescriptionLocked: {
    color: '#999',
  },
  lessonMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flexWrap: 'wrap',
  },
  lessonMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  lessonMetaText: {
    color: '#999',
    fontSize: 12,
  },
  freeChip: {
    backgroundColor: '#dbeafe',
    height: 20,
  },
  freeChipText: {
    fontSize: 10,
    color: '#2563eb',
  },
  completedChip: {
    backgroundColor: '#d1fae5',
    height: 28,
  },
  completedChipText: {
    fontSize: 11,
    color: '#4DB83D',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    gap: 12,
  },
  errorText: {
    color: '#666',
    textAlign: 'center',
  },
})
