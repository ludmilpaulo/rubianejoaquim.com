import React, { useState, useEffect, useCallback } from 'react'
import {
  View,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Alert,
} from 'react-native'
import { Text, Card, Button } from 'react-native-paper'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useNavigation } from '@react-navigation/native'
import { useAppSelector } from '../hooks/redux'
import { coursesApi, referralApi } from '../services/api'
import {
  courseProductId,
  isIapSupported,
  purchaseIapProduct,
} from '../services/iap'
import { useI18n } from '../contexts/I18nContext'
import { useActionFeedback } from '../hooks/useActionFeedback'
import { ZendaLoading } from '../components/ui/ZendaLoader'
import { getApiErrorMessage } from '../types/api'
import { logger } from '../utils/logger'
import { colors } from '../theme'

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
  const { t, tw } = useI18n()
  const feedback = useActionFeedback()
  const navigation = useNavigation<any>()
  const { user } = useAppSelector((state) => state.auth)
  const [courses, setCourses] = useState<Course[]>([])
  const [enrollments, setEnrollments] = useState<Enrollment[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [enrollingId, setEnrollingId] = useState<number | null>(null)
  const [pointsBalance, setPointsBalance] = useState<number>(0)
  const [pointsBalanceKz, setPointsBalanceKz] = useState<number>(0)
  const [redeemingId, setRedeemingId] = useState<number | null>(null)
  const [iapPurchasingId, setIapPurchasingId] = useState<number | null>(null)

  const loadData = useCallback(async () => {
    try {
      setLoadError(null)
      const [coursesRes, enrollmentsRes, pointsRes] = await Promise.all([
        coursesApi.list(),
        coursesApi.myEnrollments(),
        referralApi.getPointsBalance().catch(() => ({ balance: 0, balance_kz: 0 })),
      ])

      if (pointsRes?.balance !== undefined) {
        setPointsBalance(pointsRes.balance)
        setPointsBalanceKz(pointsRes.balance_kz ?? pointsRes.balance * 1000)
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
      logger.error('Error loading courses:', e)
      setCourses([])
      setEnrollments([])
      setLoadError(getApiErrorMessage(e, 'feedback.tryAgain'))
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
      Alert.alert(t('education.pendingEnrollmentTitle'), t('education.pendingEnrollmentMsg'))
      return
    }
    setEnrollingId(course.id)
    await feedback.run(
      async () => {
        const referralCode = referralCodeFromShare || undefined
        await coursesApi.enroll(course.id, referralCode)
        Alert.alert(t('education.enrollCreatedTitle'), t('education.enrollCreatedMsg'))
        await loadData()
        navigation.navigate('EducationMain')
      },
      {
        pendingKey: `enroll-${course.id}`,
        pendingMessage: 'feedback.enrolling',
        errorFallback: 'education.enrollFailed',
      },
    )
    setEnrollingId(null)
  }

  const handleRedeemWithPoints = async (course: Course, usePartial: boolean = false) => {
    const coursePriceKz = parseFloat(course.price || '0')
    const pointsNeeded = coursePriceKz / 1000 // 1 point = 1000 KZ
    
    if (pointsBalance <= 0) {
      Alert.alert(t('education.noPointsTitle'), t('education.noPointsMsg'))
      return
    }

    if (usePartial && pointsBalance < pointsNeeded) {
      // Partial payment
      const remainingKz = coursePriceKz - pointsBalanceKz
      Alert.alert(
        t('education.partialPointsTitle'),
        tw('education.partialPointsMsg', {
          points: pointsBalance.toFixed(1),
          pointsKz: pointsBalanceKz.toFixed(0),
          remainKz: remainingKz.toFixed(0),
        }),
        [
          { text: t('common.cancel'), style: 'cancel' },
          {
            text: t('common.confirm'),
            onPress: async () => {
              setRedeemingId(course.id)
              await feedback.run(
                async () => {
                  const result = await referralApi.redeemCourse(course.id, pointsBalance)
                  const remain = result.remaining_kz ?? remainingKz
                  Alert.alert(
                    t('education.pointsAppliedTitle'),
                    result.message ||
                      tw('education.pointsAppliedRemain', { remainKz: remain.toFixed(0) })
                  )
                  await loadData()
                  navigation.navigate('EducationMain')
                },
                {
                  pendingKey: `redeem-${course.id}`,
                  pendingMessage: 'feedback.processing',
                  errorFallback: 'education.redeemFailed',
                },
              )
              setRedeemingId(null)
            },
          },
        ]
      )
    } else if (pointsBalance >= pointsNeeded) {
      // Full payment
      Alert.alert(
        t('education.confirmPurchaseTitle'),
        tw('education.confirmPurchaseMsg', {
          points: pointsNeeded.toFixed(1),
          priceKz: coursePriceKz.toFixed(0),
          title: course.title,
        }),
        [
          { text: t('common.cancel'), style: 'cancel' },
          {
            text: t('common.confirm'),
            onPress: async () => {
              setRedeemingId(course.id)
              await feedback.run(
                async () => {
                  await referralApi.redeemCourse(course.id)
                  Alert.alert(t('common.success'), t('education.courseRedeemSuccess'))
                  await loadData()
                  navigation.navigate('EducationMain')
                },
                {
                  pendingKey: `redeem-${course.id}`,
                  pendingMessage: 'feedback.processing',
                  errorFallback: 'education.redeemFailed',
                },
              )
              setRedeemingId(null)
            },
          },
        ]
      )
    } else {
      Alert.alert(
        t('education.insufficientPointsTitle'),
        tw('education.insufficientPointsMsg', {
          needed: pointsNeeded.toFixed(1),
          have: pointsBalance.toFixed(1),
        })
      )
    }
  }

  const handleBuyWithApple = async (course: Course) => {
    if (!isIapSupported()) {
      Alert.alert(t('common.error'), t('access.iapUnavailable'))
      return
    }
    const productId = courseProductId(course.id)
    setIapPurchasingId(course.id)
    await feedback.run(
      async () => {
        await purchaseIapProduct(productId)
        Alert.alert(t('common.success'), t('access.iapSuccess'))
        await loadData()
        navigation.navigate('EducationMain')
      },
      {
        pendingKey: `iap-${course.id}`,
        pendingMessage: 'feedback.processingSubscription',
        silentError: true,
        onError: (err: unknown) => {
          const message = err instanceof Error ? err.message : t('access.iapFailed')
          if (message !== 'Purchase cancelled') {
            Alert.alert(t('common.error'), message)
          }
        },
      },
    )
    setIapPurchasingId(null)
  }

  if (loading && courses.length === 0) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        {loadError ? (
          <View style={styles.centered}>
            <MaterialCommunityIcons name="alert-circle-outline" size={48} color={colors.danger} />
            <Text variant="bodyLarge" style={styles.loadingText}>{loadError}</Text>
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
                <MaterialCommunityIcons name="star-circle" size={24} color="#E67E22" />
                <View style={styles.pointsInfo}>
                  <Text variant="bodyMedium" style={styles.pointsLabel}>
                    {t('education.pointsAvailable')}
                  </Text>
                  <Text variant="titleLarge" style={styles.pointsValue}>
                    {tw('education.pointsDisplay', {
                      points: pointsBalance.toFixed(1),
                      kz: pointsBalanceKz.toFixed(0),
                    })}
                  </Text>
                </View>
              </View>
            </Card.Content>
          </Card>
        )}
        
        <Text variant="titleMedium" style={styles.intro}>
          {t('education.catalogIntro')}
        </Text>
        {courses.length === 0 ? (
          <Card style={styles.card}>
            <Card.Content style={styles.emptyContent}>
              <MaterialCommunityIcons name="book-open-outline" size={56} color="#999" />
              <Text variant="bodyLarge" style={styles.emptyText}>
                {t('education.noCoursesAvailable')}
              </Text>
            </Card.Content>
          </Card>
        ) : (
          courses.map((course) => {
            const enrollment = getEnrollmentForCourse(course.id)
            const isActive = enrollment?.status === 'active'
            const isPending = enrollment?.status === 'pending'
            const isEnrolling = enrollingId === course.id || feedback.isPending(`enroll-${course.id}`)
            const isIapPurchasing = iapPurchasingId === course.id || feedback.isPending(`iap-${course.id}`)
            const isRedeeming = redeemingId === course.id || feedback.isPending(`redeem-${course.id}`)
            const coursePrice = parseFloat(course.price || '0')
            return (
              <Card key={course.id} style={styles.courseCard}>
                <Card.Content>
                  <View style={styles.courseHeader}>
                    <View style={styles.courseIconWrap}>
                      <MaterialCommunityIcons name="book-open" size={28} color="#3534C9" />
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
                      {t('education.alreadyEnrolled')}
                    </Button>
                  ) : isPending ? (
                    <Button
                      mode="outlined"
                      onPress={() => navigation.navigate('EducationMain')}
                      style={styles.btn}
                    >
                      {t('education.goUploadProof')}
                    </Button>
                  ) : (
                    <View style={styles.buttonGroup}>
                      {isIapSupported() && coursePrice > 0 && (
                        <Button
                          mode="contained"
                          onPress={() => handleBuyWithApple(course)}
                          loading={isIapPurchasing}
                          disabled={isIapPurchasing || isEnrolling || isRedeeming}
                          style={[styles.btn, styles.iapBtn]}
                          icon="apple"
                          buttonColor="#000"
                        >
                          {isIapPurchasing ? t('feedback.processingSubscription') : t('education.buyWithApple')}
                        </Button>
                      )}
                      {pointsBalance > 0 && coursePrice > 0 && (
                        <>
                          {pointsBalance >= coursePrice / 1000 ? (
                            <Button
                              mode="contained"
                              onPress={() => handleRedeemWithPoints(course, false)}
                              loading={isRedeeming}
                              disabled={isRedeeming || isEnrolling || isIapPurchasing}
                              style={[styles.btn, styles.redeemBtn]}
                              icon="star"
                            >
                              {isRedeeming ? t('feedback.processing') : t('education.redeemWithPoints')}
                            </Button>
                          ) : (
                            <Button
                              mode="contained"
                              onPress={() => handleRedeemWithPoints(course, true)}
                              loading={isRedeeming}
                              disabled={isRedeeming || isEnrolling || isIapPurchasing}
                              style={[styles.btn, styles.redeemBtn]}
                              icon="star"
                            >
                              {isRedeeming
                                ? t('feedback.processing')
                                : tw('education.redeemPartialBtn', { points: pointsBalance.toFixed(1) })}
                            </Button>
                          )}
                        </>
                      )}
                      <Button
                        mode={pointsBalance > 0 && coursePrice > 0 ? 'outlined' : 'contained'}
                        onPress={() => handleEnroll(course)}
                        loading={isEnrolling}
                        disabled={isEnrolling || isRedeeming || isIapPurchasing}
                        style={styles.btn}
                      >
                        {isEnrolling ? t('feedback.enrolling') : t('education.payTransfer')}
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
  price: { color: '#3534C9', fontWeight: '600', marginTop: 4 },
  btn: { marginTop: 4 },
  buttonGroup: { gap: 8, marginTop: 4 },
  redeemBtn: { backgroundColor: '#E67E22' },
  iapBtn: { backgroundColor: '#000' },
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
