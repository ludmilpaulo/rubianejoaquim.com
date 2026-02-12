import React, { useState, useEffect, useCallback } from 'react'
import {
  View,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native'
import { Text, Card, Button } from 'react-native-paper'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useNavigation } from '@react-navigation/native'
import { coursesApi } from '../services/api'

interface Course {
  id: number
  title: string
  slug: string
  short_description?: string
  price: string
  image?: string | null
  lessons_count?: number
  free_lessons_count?: number
}

interface Enrollment {
  id: number
  course: { id: number; title: string }
  status: string
}

export default function CourseListScreen() {
  const navigation = useNavigation<any>()
  const [courses, setCourses] = useState<Course[]>([])
  const [enrollments, setEnrollments] = useState<Enrollment[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [enrollingId, setEnrollingId] = useState<number | null>(null)

  const loadData = useCallback(async () => {
    try {
      const [coursesRes, enrollmentsRes] = await Promise.all([
        coursesApi.list(),
        coursesApi.myEnrollments(),
      ])
      const coursesList = Array.isArray(coursesRes)
        ? coursesRes
        : coursesRes?.results ?? coursesRes?.data?.results ?? coursesRes?.data ?? []
      setCourses(Array.isArray(coursesList) ? coursesList : [])
      const enrollmentsList = Array.isArray(enrollmentsRes)
        ? enrollmentsRes
        : enrollmentsRes?.results ?? enrollmentsRes?.data?.results ?? enrollmentsRes?.data ?? []
      setEnrollments(Array.isArray(enrollmentsList) ? enrollmentsList : [])
    } catch (e) {
      console.error('Error loading courses:', e)
      setCourses([])
      setEnrollments([])
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  const onRefresh = () => {
    setRefreshing(true)
    loadData()
  }

  const getEnrollmentForCourse = (courseId: number) =>
    enrollments.find((e) => e.course.id === courseId)

  const handleEnroll = async (course: Course) => {
    const existing = getEnrollmentForCourse(course.id)
    if (existing?.status === 'active') {
      navigation.navigate('EducationMain')
      return
    }
    if (existing?.status === 'pending') {
      Alert.alert(
        'Inscrição pendente',
        'Já tem uma inscrição pendente neste curso. Volte à aba Educação para enviar o comprovativo de pagamento.'
      )
      return
    }
    setEnrollingId(course.id)
    try {
      await coursesApi.enroll(course.id)
      Alert.alert(
        'Inscrição criada',
        'Agora efetue o pagamento e envie o comprovativo na aba Educação. O acesso será ativado após aprovação.'
      )
      await loadData()
      navigation.navigate('EducationMain')
    } catch (err: any) {
      const msg =
        err?.response?.data?.error ??
        err?.response?.data?.detail ??
        err?.message ??
        'Não foi possível inscrever.'
      Alert.alert('Erro', msg)
    } finally {
      setEnrollingId(null)
    }
  }

  if (loading && courses.length === 0) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#6366f1" />
          <Text variant="bodyLarge" style={styles.loadingText}>
            A carregar cursos...
          </Text>
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <Text variant="titleMedium" style={styles.intro}>
          Escolha o curso, pague por transferência e envie o comprovativo na aba Educação.
        </Text>
        {courses.length === 0 ? (
          <Card style={styles.card}>
            <Card.Content style={styles.emptyContent}>
              <MaterialCommunityIcons name="book-open-outline" size={56} color="#999" />
              <Text variant="bodyLarge" style={styles.emptyText}>
                Nenhum curso disponível
              </Text>
            </Card.Content>
          </Card>
        ) : (
          courses.map((course) => {
            const enrollment = getEnrollmentForCourse(course.id)
            const isActive = enrollment?.status === 'active'
            const isPending = enrollment?.status === 'pending'
            const isEnrolling = enrollingId === course.id
            return (
              <Card key={course.id} style={styles.courseCard}>
                <Card.Content>
                  <View style={styles.courseHeader}>
                    <View style={styles.courseIconWrap}>
                      <MaterialCommunityIcons name="book-open" size={28} color="#6366f1" />
                    </View>
                    <View style={styles.courseInfo}>
                      <Text variant="titleMedium" style={styles.courseTitle}>
                        {course.title}
                      </Text>
                      {course.short_description ? (
                        <Text variant="bodySmall" style={styles.courseDesc} numberOfLines={2}>
                          {course.short_description}
                        </Text>
                      ) : null}
                      <Text variant="bodyMedium" style={styles.price}>
                        {course.price || '—'}
                      </Text>
                    </View>
                  </View>
                  {isActive ? (
                    <Button
                      mode="outlined"
                      onPress={() => navigation.navigate('EducationMain')}
                      style={styles.btn}
                    >
                      Já tem acesso
                    </Button>
                  ) : isPending ? (
                    <Button
                      mode="outlined"
                      onPress={() => navigation.navigate('EducationMain')}
                      style={styles.btn}
                    >
                      Enviar comprovativo na aba Educação
                    </Button>
                  ) : (
                    <Button
                      mode="contained"
                      onPress={() => handleEnroll(course)}
                      loading={isEnrolling}
                      disabled={isEnrolling}
                      style={styles.btn}
                    >
                      Inscrever e pagar por transferência
                    </Button>
                  )}
                </Card.Content>
              </Card>
            )
          })
        )}
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#f5f5f5' },
  container: { flex: 1 },
  content: { padding: 16, paddingBottom: 32 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  loadingText: { color: '#666' },
  intro: {
    color: '#555',
    marginBottom: 16,
    textAlign: 'center',
  },
  card: { marginBottom: 12 },
  emptyContent: { alignItems: 'center', paddingVertical: 32 },
  emptyText: { color: '#666', marginTop: 8 },
  courseCard: { marginBottom: 12 },
  courseHeader: { flexDirection: 'row', marginBottom: 12 },
  courseIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#eef2ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  courseInfo: { flex: 1 },
  courseTitle: { fontWeight: '600', color: '#111' },
  courseDesc: { color: '#666', marginTop: 4 },
  price: { color: '#6366f1', fontWeight: '600', marginTop: 4 },
  btn: { marginTop: 4 },
})
