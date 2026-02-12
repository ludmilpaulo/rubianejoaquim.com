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
import { useAppSelector } from '../hooks/redux'
import { coursesApi, referralApi } from '../services/api'

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
  const { user } = useAppSelector((state) => state.auth)
  const [courses, setCourses] = useState<Course[]>([])
  const [enrollments, setEnrollments] = useState<Enrollment[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [enrollingId, setEnrollingId] = useState<number | null>(null)
  const [pointsBalance, setPointsBalance] = useState<number>(0)
  const [redeemingId, setRedeemingId] = useState<number | null>(null)

  const loadData = useCallback(async () => {
    try {
      const [coursesRes, enrollmentsRes, pointsRes] = await Promise.all([
        coursesApi.list(),
        coursesApi.myEnrollments(),
        referralApi.getPointsBalance().catch(() => ({ balance: 0 })),
      ])
      
      if (pointsRes?.balance !== undefined) {
        setPointsBalance(pointsRes.balance)
      }
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

  const handleEnroll = async (course: Course, referralCodeFromShare?: string) => {
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
      // Use referral code from shared link if available, otherwise use user's referral code
      const referralCode = referralCodeFromShare || undefined
      await coursesApi.enroll(course.id, referralCode)
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

  const handleRedeemWithPoints = async (course: Course, usePartial: boolean = false) => {
    const coursePriceKz = parseFloat(course.price || '0')
    const pointsNeeded = coursePriceKz / 1000 // 1 point = 1000 KZ
    
    if (pointsBalance <= 0) {
      Alert.alert('Sem pontos', 'Não tem pontos disponíveis para usar.')
      return
    }

    if (usePartial && pointsBalance < pointsNeeded) {
      // Partial payment
      const remainingKz = coursePriceKz - (pointsBalance * 1000)
      Alert.alert(
        'Usar pontos parciais',
        `Deseja usar ${pointsBalance.toFixed(1)} pontos (${(pointsBalance * 1000).toFixed(0)} KZ) e pagar ${remainingKz.toFixed(0)} KZ restantes por transferência?`,
        [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: 'Confirmar',
            onPress: async () => {
              setRedeemingId(course.id)
              try {
                const result = await referralApi.redeemCourse(course.id, pointsBalance)
                Alert.alert(
                  'Pontos aplicados',
                  result.message || `Pontos aplicados! Resta pagar ${remainingKz.toFixed(0)} KZ e enviar comprovativo na aba Educação.`
                )
                await loadData()
                navigation.navigate('EducationMain')
              } catch (err: any) {
                const msg =
                  err?.response?.data?.error ??
                  err?.response?.data?.detail ??
                  err?.message ??
                  'Não foi possível resgatar.'
                Alert.alert('Erro', msg)
              } finally {
                setRedeemingId(null)
              }
            },
          },
        ]
      )
    } else if (pointsBalance >= pointsNeeded) {
      // Full payment
      Alert.alert(
        'Confirmar compra',
        `Deseja usar ${pointsNeeded.toFixed(1)} pontos (${coursePriceKz.toFixed(0)} KZ) para adquirir "${course.title}"?`,
        [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: 'Confirmar',
            onPress: async () => {
              setRedeemingId(course.id)
              try {
                await referralApi.redeemCourse(course.id)
                Alert.alert('Sucesso', 'Curso adquirido com pontos!')
                await loadData()
                navigation.navigate('EducationMain')
              } catch (err: any) {
                const msg =
                  err?.response?.data?.error ??
                  err?.response?.data?.detail ??
                  err?.message ??
                  'Não foi possível resgatar.'
                Alert.alert('Erro', msg)
              } finally {
                setRedeemingId(null)
              }
            },
          },
        ]
      )
    } else {
      Alert.alert(
        'Pontos insuficientes',
        `Necessita de ${pointsNeeded.toFixed(1)} pontos para este curso. Tem ${pointsBalance.toFixed(1)} pontos disponíveis.\n\nPode usar seus pontos e pagar o restante por transferência.`
      )
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
        {/* Points Balance */}
        {pointsBalance > 0 && (
          <Card style={styles.pointsCard}>
            <Card.Content>
              <View style={styles.pointsRow}>
                <MaterialCommunityIcons name="star-circle" size={24} color="#f59e0b" />
                <View style={styles.pointsInfo}>
                  <Text variant="bodyMedium" style={styles.pointsLabel}>
                    Pontos Disponíveis
                  </Text>
                  <Text variant="titleLarge" style={styles.pointsValue}>
                    {pointsBalance.toFixed(1)} pts ({(pointsBalance * 1000).toFixed(0)} KZ)
                  </Text>
                </View>
              </View>
            </Card.Content>
          </Card>
        )}
        
        <Text variant="titleMedium" style={styles.intro}>
          Escolha o curso. Se tiver pontos, pode usá-los para comprar. Caso contrário, pague por transferência e envie o comprovativo na aba Educação.
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
                    <View style={styles.buttonGroup}>
                      {pointsBalance > 0 && parseFloat(course.price || '0') > 0 && (
                        <>
                          {pointsBalance >= parseFloat(course.price || '0') / 1000 ? (
                            <Button
                              mode="contained"
                              onPress={() => handleRedeemWithPoints(course, false)}
                              loading={redeemingId === course.id}
                              disabled={redeemingId === course.id || enrollingId === course.id}
                              style={[styles.btn, styles.redeemBtn]}
                              icon="star"
                            >
                              Usar pontos para este curso
                            </Button>
                          ) : (
                            <Button
                              mode="contained"
                              onPress={() => handleRedeemWithPoints(course, true)}
                              loading={redeemingId === course.id}
                              disabled={redeemingId === course.id || enrollingId === course.id}
                              style={[styles.btn, styles.redeemBtn]}
                              icon="star"
                            >
                              Usar {pointsBalance.toFixed(1)} pts + pagar restante
                            </Button>
                          )}
                        </>
                      )}
                      <Button
                        mode={pointsBalance > 0 && parseFloat(course.price || '0') > 0 ? "outlined" : "contained"}
                        onPress={() => handleEnroll(course)}
                        loading={isEnrolling}
                        disabled={isEnrolling || redeemingId === course.id}
                        style={styles.btn}
                      >
                        Pagar por transferência
                      </Button>
                    </View>
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
  buttonGroup: { gap: 8, marginTop: 4 },
  redeemBtn: { backgroundColor: '#f59e0b' },
  pointsCard: {
    marginBottom: 16,
    backgroundColor: '#fef3c7',
  },
  pointsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  pointsInfo: {
    marginLeft: 12,
    flex: 1,
  },
  pointsLabel: {
    color: '#92400e',
    marginBottom: 4,
  },
  pointsValue: {
    color: '#92400e',
    fontWeight: 'bold',
  },
})
