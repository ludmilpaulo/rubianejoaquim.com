import React, { useState, useEffect } from 'react'
import { View, StyleSheet, ScrollView, RefreshControl, TouchableOpacity, Dimensions, Alert } from 'react-native'
import { Text, Card, Button, ProgressBar, Chip } from 'react-native-paper'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useNavigation } from '@react-navigation/native'
import { coursesApi, lessonsApi } from '../services/api'

const { width } = Dimensions.get('window')

interface Enrollment {
  id: number
  course: {
    id: number
    title: string
    slug: string
    price: string
  }
  status: string
  enrolled_at: string
  activated_at: string | null
  progress?: {
    completed_lessons: number
    total_lessons: number
    percentage: number
  } | null
}

interface Lesson {
  id: number
  course: {
    id: number
    title: string
    slug: string
  }
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

export default function EducationScreen() {
  const navigation = useNavigation<any>()
  const [refreshing, setRefreshing] = useState(false)
  const [enrollments, setEnrollments] = useState<Enrollment[]>([])
  const [recentLessons, setRecentLessons] = useState<Lesson[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      const [enrollmentsRes, lessonsRes] = await Promise.all([
        coursesApi.myEnrollments(),
        lessonsApi.list(),
      ])
      
      // Handle enrollments response
      let enrollmentsData: Enrollment[] = []
      if (Array.isArray(enrollmentsRes)) {
        enrollmentsData = enrollmentsRes
      } else if (enrollmentsRes.results) {
        enrollmentsData = enrollmentsRes.results
      } else if (enrollmentsRes.data) {
        enrollmentsData = Array.isArray(enrollmentsRes.data) 
          ? enrollmentsRes.data 
          : enrollmentsRes.data.results || []
      }
      
      setEnrollments(enrollmentsData.filter((e: Enrollment) => e.status === 'active'))
      
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
      
      // Sort by order and get recent ones
      const sortedLessons = lessonsData
        .sort((a: Lesson, b: Lesson) => {
          // Prioritize completed lessons, then by order
          if (a.progress?.completed && !b.progress?.completed) return -1
          if (!a.progress?.completed && b.progress?.completed) return 1
          return a.order - b.order
        })
        .slice(0, 5)
      
      setRecentLessons(sortedLessons)
    } catch (error) {
      console.error('Error loading education data:', error)
    } finally {
      setLoading(false)
    }
  }

  const onRefresh = async () => {
    setRefreshing(true)
    await loadData()
    setRefreshing(false)
  }

  const handleCoursePress = (enrollment: Enrollment) => {
    // Navigate to course detail or lessons list
    // For now, we'll show lessons for this course
    navigation.navigate('CourseLessons', { courseId: enrollment.course.id, enrollmentId: enrollment.id })
  }

  const handleLessonPress = (lesson: Lesson) => {
    // Navigate to lesson detail screen
    navigation.navigate('LessonDetail', { lessonId: lesson.id })
  }

  const totalCourses = enrollments.length
  const totalLessons = enrollments.reduce((sum, e) => sum + (e.progress?.total_lessons || 0), 0)
  const completedLessons = enrollments.reduce((sum, e) => sum + (e.progress?.completed_lessons || 0), 0)
  const overallProgress = totalLessons > 0 ? (completedLessons / totalLessons) * 100 : 0

  if (loading && enrollments.length === 0 && recentLessons.length === 0) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.loadingContainer}>
          <MaterialCommunityIcons name="book-open-outline" size={64} color="#ccc" />
          <Text variant="bodyLarge" style={styles.loadingText}>
            Carregando...
          </Text>
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView
        style={styles.container}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text variant="headlineSmall" style={styles.title}>
              Educação Financeira
            </Text>
            <Text variant="bodySmall" style={styles.subtitle}>
              {totalCourses} curso{totalCourses !== 1 ? 's' : ''} ativo{totalCourses !== 1 ? 's' : ''}
            </Text>
          </View>
        </View>

        {/* Overall Progress Card */}
        <Card style={styles.progressCard}>
          <Card.Content>
            <View style={styles.progressHeader}>
              <View style={styles.progressIconContainer}>
                <MaterialCommunityIcons name="trophy" size={32} color="#f59e0b" />
              </View>
              <View style={styles.progressInfo}>
                <Text variant="titleLarge" style={styles.progressTitle}>
                  Progresso Geral
                </Text>
                <Text variant="bodyMedium" style={styles.progressSubtitle}>
                  {completedLessons} de {totalLessons} aulas concluídas
                </Text>
              </View>
            </View>
            <ProgressBar 
              progress={overallProgress / 100} 
              color="#f59e0b" 
              style={styles.progressBar} 
            />
            <Text variant="bodySmall" style={styles.progressPercentage}>
              {overallProgress.toFixed(0)}% completo
            </Text>
            
            {/* Stats Grid */}
            <View style={styles.statsGrid}>
              <View style={styles.statCard}>
                <MaterialCommunityIcons name="book-open" size={24} color="#6366f1" />
                <Text variant="headlineSmall" style={styles.statValue}>{totalCourses}</Text>
                <Text variant="bodySmall" style={styles.statLabel}>Cursos</Text>
              </View>
              <View style={styles.statCard}>
                <MaterialCommunityIcons name="play-circle" size={24} color="#10b981" />
                <Text variant="headlineSmall" style={styles.statValue}>{completedLessons}</Text>
                <Text variant="bodySmall" style={styles.statLabel}>Concluídas</Text>
              </View>
              <View style={styles.statCard}>
                <MaterialCommunityIcons name="certificate" size={24} color="#8b5cf6" />
                <Text variant="headlineSmall" style={styles.statValue}>
                  {enrollments.filter(e => e.progress && e.progress.percentage === 100).length}
                </Text>
                <Text variant="bodySmall" style={styles.statLabel}>Certificados</Text>
              </View>
            </View>
          </Card.Content>
        </Card>

        {/* My Courses Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text variant="titleMedium" style={styles.sectionTitle}>
              Meus Cursos
            </Text>
            {enrollments.length > 0 && (
              <Chip icon="book" compact style={styles.countChip}>
                {enrollments.length}
              </Chip>
            )}
          </View>

          {enrollments.length === 0 ? (
            <Card style={styles.card}>
              <Card.Content style={styles.emptyContent}>
                <MaterialCommunityIcons name="book-open-outline" size={64} color="#ccc" />
                <Text variant="bodyLarge" style={styles.emptyText}>
                  Nenhum curso iniciado ainda
                </Text>
                <Text variant="bodySmall" style={styles.emptySubtext}>
                  Explore nossos cursos e comece sua jornada de educação financeira
                </Text>
                <Button
                  mode="contained"
                  onPress={() => {
                    // Navigate to courses list (if available)
                    Alert.alert('Explorar Cursos', 'Funcionalidade em desenvolvimento')
                  }}
                  style={styles.button}
                >
                  Explorar Cursos
                </Button>
              </Card.Content>
            </Card>
          ) : (
            enrollments.map(enrollment => {
              const progress = enrollment.progress || { completed_lessons: 0, total_lessons: 0, percentage: 0 }
              const isCompleted = progress.percentage === 100
              
              return (
                <TouchableOpacity
                  key={enrollment.id}
                  onPress={() => handleCoursePress(enrollment)}
                  activeOpacity={0.7}
                >
                  <Card style={[styles.courseCard, isCompleted && styles.courseCardCompleted]}>
                    <Card.Content>
                      <View style={styles.courseHeader}>
                        <View style={styles.courseIconContainer}>
                          <MaterialCommunityIcons 
                            name={isCompleted ? "trophy" : "book-open"} 
                            size={28} 
                            color={isCompleted ? "#f59e0b" : "#6366f1"} 
                          />
                        </View>
                        <View style={styles.courseInfo}>
                          <Text variant="titleMedium" style={styles.courseTitle}>
                            {enrollment.course.title}
                          </Text>
                          <View style={styles.courseMeta}>
                            <Chip
                              icon={isCompleted ? "check-circle" : "clock"}
                              style={[
                                styles.statusChip,
                                isCompleted && styles.statusChipCompleted
                              ]}
                              textStyle={styles.statusChipText}
                              compact
                            >
                              {isCompleted ? 'Concluído' : 'Em Progresso'}
                            </Chip>
                            {enrollment.activated_at && (
                              <Text variant="bodySmall" style={styles.activatedDate}>
                                Iniciado em {new Date(enrollment.activated_at).toLocaleDateString('pt-PT')}
                              </Text>
                            )}
                          </View>
                        </View>
                        <MaterialCommunityIcons name="chevron-right" size={24} color="#999" />
                      </View>

                      {/* Progress Bar */}
                      {progress.total_lessons > 0 && (
                        <View style={styles.courseProgressSection}>
                          <View style={styles.courseProgressHeader}>
                            <Text variant="bodyMedium" style={styles.courseProgressText}>
                              {progress.completed_lessons} / {progress.total_lessons} aulas
                            </Text>
                            <Text variant="bodyMedium" style={styles.courseProgressPercentage}>
                              {progress.percentage.toFixed(0)}%
                            </Text>
                          </View>
                          <ProgressBar
                            progress={progress.percentage / 100}
                            color={isCompleted ? "#10b981" : "#6366f1"}
                            style={styles.courseProgressBar}
                          />
                        </View>
                      )}

                      {/* Course Stats */}
                      <View style={styles.courseStats}>
                        <View style={styles.courseStat}>
                          <MaterialCommunityIcons name="play-circle" size={16} color="#666" />
                          <Text variant="bodySmall" style={styles.courseStatText}>
                            {progress.completed_lessons} concluídas
                          </Text>
                        </View>
                        <View style={styles.courseStat}>
                          <MaterialCommunityIcons name="clock-outline" size={16} color="#666" />
                          <Text variant="bodySmall" style={styles.courseStatText}>
                            {progress.total_lessons - progress.completed_lessons} restantes
                          </Text>
                        </View>
                      </View>
                    </Card.Content>
                  </Card>
                </TouchableOpacity>
              )
            })
          )}
        </View>

        {/* Recent Lessons Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text variant="titleMedium" style={styles.sectionTitle}>
              Aulas Recentes
            </Text>
          </View>

          {recentLessons.length === 0 ? (
            <Card style={styles.card}>
              <Card.Content style={styles.emptyContent}>
                <MaterialCommunityIcons name="play-circle-outline" size={64} color="#ccc" />
                <Text variant="bodyLarge" style={styles.emptyText}>
                  Nenhuma aula visualizada ainda
                </Text>
                <Text variant="bodySmall" style={styles.emptySubtext}>
                  Comece um curso para ver suas aulas aqui
                </Text>
              </Card.Content>
            </Card>
          ) : (
            recentLessons.map(lesson => (
              <TouchableOpacity
                key={lesson.id}
                onPress={() => handleLessonPress(lesson)}
                activeOpacity={0.7}
              >
                <Card style={styles.lessonCard}>
                  <Card.Content>
                    <View style={styles.lessonHeader}>
                      <View style={styles.lessonLeft}>
                        <View style={[
                          styles.lessonIconContainer,
                          lesson.progress?.completed && styles.lessonIconCompleted
                        ]}>
                          <MaterialCommunityIcons
                            name={lesson.progress?.completed ? "check-circle" : "play-circle"}
                            size={24}
                            color={lesson.progress?.completed ? "#10b981" : "#6366f1"}
                          />
                        </View>
                        <View style={styles.lessonInfo}>
                          <Text
                            variant="titleSmall"
                            style={[
                              styles.lessonTitle,
                              lesson.progress?.completed && styles.lessonTitleCompleted
                            ]}
                          >
                            {lesson.title}
                          </Text>
                          <Text variant="bodySmall" style={styles.lessonCourse}>
                            {lesson.course.title}
                          </Text>
                          {lesson.duration && (
                            <View style={styles.lessonMeta}>
                              <MaterialCommunityIcons name="clock-outline" size={14} color="#999" />
                              <Text variant="bodySmall" style={styles.lessonDuration}>
                                {Math.floor(lesson.duration / 60)} min
                              </Text>
                            </View>
                          )}
                        </View>
                      </View>
                      {lesson.progress?.completed && (
                        <Chip
                          icon="check-circle"
                          style={styles.completedChip}
                          textStyle={styles.completedChipText}
                          compact
                        >
                          Concluída
                        </Chip>
                      )}
                    </View>
                  </Card.Content>
                </Card>
              </TouchableOpacity>
            ))
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
  header: {
    padding: 16,
    paddingTop: 8,
    backgroundColor: '#fff',
  },
  title: {
    fontWeight: 'bold',
    color: '#1f2937',
  },
  subtitle: {
    color: '#666',
    marginTop: 4,
  },
  progressCard: {
    margin: 16,
    borderRadius: 16,
    elevation: 4,
    backgroundColor: '#fff',
  },
  progressHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  progressIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#fef3c7',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  progressInfo: {
    flex: 1,
  },
  progressTitle: {
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 4,
  },
  progressSubtitle: {
    color: '#666',
  },
  progressBar: {
    height: 10,
    borderRadius: 5,
    marginTop: 12,
    marginBottom: 8,
  },
  progressPercentage: {
    textAlign: 'right',
    color: '#666',
    fontWeight: '600',
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 20,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  statCard: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    fontWeight: 'bold',
    marginTop: 8,
    color: '#1f2937',
  },
  statLabel: {
    color: '#666',
    marginTop: 4,
    fontSize: 12,
  },
  section: {
    marginBottom: 24,
    paddingHorizontal: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionTitle: {
    fontWeight: 'bold',
    color: '#1f2937',
  },
  countChip: {
    backgroundColor: '#eef2ff',
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
    marginBottom: 8,
    color: '#999',
    textAlign: 'center',
    fontWeight: '600',
  },
  emptySubtext: {
    color: '#999',
    textAlign: 'center',
    marginBottom: 24,
  },
  button: {
    marginTop: 8,
  },
  courseCard: {
    marginBottom: 12,
    borderRadius: 12,
    elevation: 2,
  },
  courseCardCompleted: {
    borderLeftWidth: 4,
    borderLeftColor: '#10b981',
  },
  courseHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  courseIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#eef2ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  courseInfo: {
    flex: 1,
  },
  courseTitle: {
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 8,
  },
  courseMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  statusChip: {
    backgroundColor: '#eef2ff',
    height: 24,
  },
  statusChipCompleted: {
    backgroundColor: '#d1fae5',
  },
  statusChipText: {
    fontSize: 11,
    color: '#6366f1',
  },
  activatedDate: {
    color: '#999',
    fontSize: 11,
  },
  courseProgressSection: {
    marginTop: 12,
    marginBottom: 12,
  },
  courseProgressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  courseProgressText: {
    fontWeight: '600',
    color: '#1f2937',
  },
  courseProgressPercentage: {
    fontWeight: '600',
    color: '#6366f1',
  },
  courseProgressBar: {
    height: 8,
    borderRadius: 4,
  },
  courseStats: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 8,
  },
  courseStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  courseStatText: {
    color: '#666',
    fontSize: 12,
  },
  lessonCard: {
    marginBottom: 12,
    borderRadius: 12,
    elevation: 2,
  },
  lessonHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  lessonLeft: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    flex: 1,
  },
  lessonIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#eef2ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  lessonIconCompleted: {
    backgroundColor: '#d1fae5',
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
  lessonCourse: {
    color: '#666',
    fontSize: 12,
    marginBottom: 4,
  },
  lessonMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  lessonDuration: {
    color: '#999',
    fontSize: 11,
  },
  completedChip: {
    backgroundColor: '#d1fae5',
    height: 24,
  },
  completedChipText: {
    fontSize: 11,
    color: '#10b981',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  loadingText: {
    marginTop: 16,
    color: '#999',
  },
})
