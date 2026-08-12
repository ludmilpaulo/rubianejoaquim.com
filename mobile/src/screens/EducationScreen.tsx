import React, { useState, useEffect } from 'react'
import { View, StyleSheet, ScrollView, RefreshControl, TouchableOpacity, Dimensions, Alert, Share, Linking } from 'react-native'
import { Text, Card, Button, ProgressBar, Chip, TextInput, IconButton } from 'react-native-paper'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useNavigation } from '@react-navigation/native'
import * as DocumentPicker from 'expo-document-picker'
import { useAppSelector } from '../hooks/redux'
import { accessApi, coursesApi, lessonsApi, referralApi } from '../services/api'
import type { SubscriptionPaymentInfo } from '../types'
import type { PointsBalanceResponse } from '../types/points'
import { useI18n } from '../contexts/I18nContext'
import { useAlert } from '../hooks/useAlert'
import { useActionFeedback } from '../hooks/useActionFeedback'
import { ZendaLoading } from '../components/ui/ZendaLoader'
import { getApiErrorMessage } from '../types/api'
import { logger } from '../utils/logger'

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
  payment_proof?: {
    id: number
    status: string
    created_at: string
    reviewed_at: string | null
  } | null
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
  const { t, tw, locale } = useI18n()
  const dateLoc =
    locale === 'pt' ? 'pt-AO' : locale === 'fr' ? 'fr-FR' : locale === 'es' ? 'es-ES' : 'en-US'
  const alert = useAlert()
  const feedback = useActionFeedback()
  const navigation = useNavigation<any>()
  const { user } = useAppSelector((state) => state.auth)
  const [refreshing, setRefreshing] = useState(false)
  const [enrollments, setEnrollments] = useState<Enrollment[]>([])
  const [recentLessons, setRecentLessons] = useState<Lesson[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [uploadingId, setUploadingId] = useState<number | null>(null)
  const [uploadNotes, setUploadNotes] = useState<Record<number, string>>({})
  const [pointsBalance, setPointsBalance] = useState<number>(0)
  const [pointsBalanceKz, setPointsBalanceKz] = useState<number>(0)
  const [paymentInfo, setPaymentInfo] = useState<SubscriptionPaymentInfo | null>(null)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      setLoadError(null)
      const [enrollmentsRes, lessonsRes, pointsRes, payRes] = await Promise.all([
        coursesApi.myEnrollments(),
        lessonsApi.list(),
        referralApi.getPointsBalance().catch(() => ({ balance: 0, balance_kz: 0 } as PointsBalanceResponse)),
        accessApi.getSubscriptionPaymentInfo().catch(() => null),
      ])
      setPaymentInfo(payRes ?? null)
      if (pointsRes?.balance !== undefined) {
        setPointsBalance(pointsRes.balance)
        setPointsBalanceKz(pointsRes.balance_kz ?? pointsRes.balance * 1000)
      }
      
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

      const normalizedEnrollments = Array.isArray(enrollmentsData) ? enrollmentsData : []
      setEnrollments(normalizedEnrollments)
      
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

      // Only show recent lessons for courses where the user has an active enrollment
      const activeCourseIds = normalizedEnrollments
        .filter((e) => e.status === 'active')
        .map((e) => e.course.id)
      
      // Sort by order and get recent ones
      const sortedLessons = lessonsData
        .filter((lesson) => activeCourseIds.includes(lesson.course.id))
        .sort((a: Lesson, b: Lesson) => {
          // Prioritize completed lessons, then by order
          if (a.progress?.completed && !b.progress?.completed) return -1
          if (!a.progress?.completed && b.progress?.completed) return 1
          return a.order - b.order
        })
        .slice(0, 5)
      
      setRecentLessons(sortedLessons)
    } catch (error) {
      logger.error('Error loading education data:', error)
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

  const handleCoursePress = (enrollment: Enrollment) => {
    navigation.navigate('CourseLessons', { courseId: enrollment.course.id, enrollmentId: enrollment.id })
  }

  const handleUploadPaymentProof = async (enrollmentId: number) => {
    if (feedback.isPending(`upload-${enrollmentId}`)) return
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['image/*', 'application/pdf'],
        copyToCacheDirectory: true,
      })
      if (result.canceled) return
      const file = result.assets[0]
      setUploadingId(enrollmentId)
      await feedback.run(
        async () => {
          const filePayload = {
            uri: file.uri,
            name: file.name ?? `proof_${Date.now()}.jpg`,
            type: file.mimeType ?? 'image/jpeg',
          }
          await coursesApi.uploadPaymentProof(enrollmentId, filePayload, uploadNotes[enrollmentId] || undefined)
          setUploadNotes((prev) => ({ ...prev, [enrollmentId]: '' }))
          await loadData()
        },
        {
          pendingKey: `upload-${enrollmentId}`,
          pendingMessage: 'feedback.uploading',
          successMessage: 'education.proofSent',
          errorFallback: 'education.uploadFailed',
        },
      )
    } finally {
      setUploadingId(null)
    }
  }

  const handleLessonPress = (lesson: Lesson) => {
    navigation.navigate('LessonDetail', { lessonId: lesson.id })
  }

  const handleShareCourse = async (courseId: number, courseTitle: string, platform?: string) => {
    if (!user?.referral_code) {
      alert.error(t('education.referralMissing'))
      return
    }

    const baseUrl = 'https://www.rubianejoaquim.com'
    const referralUrl = `${baseUrl}/cursos/${courseId}?ref=${user.referral_code}`
    const shareMessage = tw('education.shareMessage', { title: courseTitle, url: referralUrl })
    const shareTextShort = tw('education.shareTextShort', { title: courseTitle })
    const shareTitle = tw('education.shareTitle', { title: courseTitle })

    try {
      // Track the share in backend
      await referralApi.shareCourse(courseId, platform || 'mobile')

      if (platform) {
        // Platform-specific sharing
        const encodedUrl = encodeURIComponent(referralUrl)
        const encodedText = encodeURIComponent(shareTextShort)
        
        const shareUrls: Record<string, string> = {
          facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
          twitter: `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedText}`,
          linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`,
          whatsapp: `https://wa.me/?text=${encodedText}%20${encodedUrl}`,
          telegram: `https://t.me/share/url?url=${encodedUrl}&text=${encodedText}`,
          pinterest: `https://pinterest.com/pin/create/button/?url=${encodedUrl}&description=${encodedText}`,
        }

        // Instagram and TikTok don't support direct web share URLs – use native share so user can paste in app
        if (platform === 'instagram' || platform === 'tiktok') {
          await Share.share({
            message: shareMessage,
            url: referralUrl,
            title: shareTitle,
          })
          return
        }

        const url = shareUrls[platform]
        if (url) {
          try {
            const supported = await Linking.canOpenURL(url)
            if (supported) {
              await Linking.openURL(url)
            } else {
              await Share.share({ message: shareMessage, url: referralUrl })
            }
          } catch {
            await Share.share({ message: shareMessage, url: referralUrl })
          }
        } else {
          await Share.share({ message: shareMessage, url: referralUrl })
        }
      } else {
        // Generic share
        await Share.share({
          message: shareMessage,
          url: referralUrl,
        })
      }
    } catch (error: unknown) {
      logger.error('Error sharing course:', error)
      try {
        await Share.share({ message: shareMessage })
      } catch {
        alert.error(t('education.shareError'))
      }
    }
  }

  const activeEnrollments = enrollments.filter((e) => e.status === 'active')
  const pendingEnrollments = enrollments.filter((e) => e.status === 'pending')
  const totalCourses = activeEnrollments.length
  const totalLessons = activeEnrollments.reduce((sum, e) => sum + (e.progress?.total_lessons || 0), 0)
  const completedLessons = activeEnrollments.reduce((sum, e) => sum + (e.progress?.completed_lessons || 0), 0)
  const overallProgress = totalLessons > 0 ? (completedLessons / totalLessons) * 100 : 0

  if (loading && enrollments.length === 0 && recentLessons.length === 0) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        {loadError ? (
          <View style={styles.loadingContainer}>
            <MaterialCommunityIcons name="alert-circle-outline" size={48} color="#ef4444" />
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
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text variant="headlineSmall" style={styles.title}>
              {t('education.title')}
            </Text>
            <Text variant="bodySmall" style={styles.subtitle}>
              {tw('education.activeCoursesCount', { count: totalCourses })}
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
                  {t('education.overallProgress')}
                </Text>
                <Text variant="bodyMedium" style={styles.progressSubtitle}>
                  {tw('education.lessonsCompleted', { done: completedLessons, total: totalLessons })}
                </Text>
              </View>
            </View>
            <ProgressBar 
              progress={overallProgress / 100} 
              color="#f59e0b" 
              style={styles.progressBar} 
            />
            <Text variant="bodySmall" style={styles.progressPercentage}>
              {tw('education.percentComplete', { pct: overallProgress.toFixed(0) })}
            </Text>
            
            {/* Stats Grid */}
            <View style={styles.statsGrid}>
              <View style={styles.statCard}>
                <MaterialCommunityIcons name="book-open" size={24} color="#3534C9" />
                <Text variant="headlineSmall" style={styles.statValue}>{totalCourses}</Text>
                <Text variant="bodySmall" style={styles.statLabel}>{t('education.statCourses')}</Text>
              </View>
              <View style={styles.statCard}>
                <MaterialCommunityIcons name="play-circle" size={24} color="#4DB83D" />
                <Text variant="headlineSmall" style={styles.statValue}>{completedLessons}</Text>
                <Text variant="bodySmall" style={styles.statLabel}>{t('education.statCompleted')}</Text>
              </View>
              <View style={styles.statCard}>
                <MaterialCommunityIcons name="certificate" size={24} color="#3C3BD4" />
                <Text variant="headlineSmall" style={styles.statValue}>
                  {activeEnrollments.filter(e => e.progress && e.progress.percentage === 100).length}
                </Text>
                <Text variant="bodySmall" style={styles.statLabel}>{t('education.statCertificates')}</Text>
              </View>
            </View>
            
            {/* Points Balance */}
            <View style={styles.pointsSection}>
              <View style={styles.pointsCard}>
                <MaterialCommunityIcons name="star-circle" size={24} color="#f59e0b" />
                <View style={styles.pointsInfo}>
                  <Text variant="bodyMedium" style={styles.pointsLabel}>{t('education.pointsAvailable')}</Text>
                  <Text variant="titleLarge" style={styles.pointsValue}>
                    {tw('education.pointsShort', { points: pointsBalance.toFixed(1) })}
                  </Text>
                  {locale === 'pt' && (
                    <Text variant="bodySmall" style={styles.pointsKz}>
                      {tw('education.pointsKzEquivalent', { amount: pointsBalanceKz.toFixed(0) })}
                    </Text>
                  )}
                </View>
              </View>
              <Text variant="bodySmall" style={styles.pointsHint}>
                {t('education.pointsShareHint')}
              </Text>
            </View>
          </Card.Content>
        </Card>

        {/* My Courses Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text variant="titleMedium" style={styles.sectionTitle}>
              {t('education.myCourses')}
            </Text>
            {activeEnrollments.length > 0 && (
              <Chip icon="book" compact style={styles.countChip}>
                {activeEnrollments.length}
              </Chip>
            )}
          </View>

          {activeEnrollments.length === 0 ? (
            <Card style={styles.card}>
              <Card.Content style={styles.emptyContent}>
                <MaterialCommunityIcons name="book-open-outline" size={64} color="#ccc" />
                <Text variant="bodyLarge" style={styles.emptyText}>
                  {t('education.emptyNoCourses')}
                </Text>
                <Text variant="bodySmall" style={styles.emptySubtext}>
                  {t('education.emptyExploreSub')}
                </Text>
                <Button
                  mode="contained"
                  onPress={() => navigation.navigate('CourseList')}
                  style={styles.button}
                >
                  {t('education.exploreCoursesBtn')}
                </Button>
              </Card.Content>
            </Card>
          ) : (
            <>
              {activeEnrollments.map(enrollment => {
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
                            color={isCompleted ? "#f59e0b" : "#3534C9"} 
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
                              {isCompleted ? t('education.statusCompleted') : t('education.statusInProgress')}
                            </Chip>
                            {enrollment.activated_at && (
                              <Text variant="bodySmall" style={styles.activatedDate}>
                                {tw('education.startedOn', {
                                  date: new Date(enrollment.activated_at).toLocaleDateString(dateLoc),
                                })}
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
                              {tw('education.lessonsCount', {
                                done: progress.completed_lessons,
                                total: progress.total_lessons,
                              })}
                            </Text>
                            <Text variant="bodyMedium" style={styles.courseProgressPercentage}>
                              {progress.percentage.toFixed(0)}%
                            </Text>
                          </View>
                          <ProgressBar
                            progress={progress.percentage / 100}
                            color={isCompleted ? "#4DB83D" : "#3534C9"}
                            style={styles.courseProgressBar}
                          />
                        </View>
                      )}

                      {/* Course Stats */}
                      <View style={styles.courseStats}>
                        <View style={styles.courseStat}>
                          <MaterialCommunityIcons name="play-circle" size={16} color="#666" />
                          <Text variant="bodySmall" style={styles.courseStatText}>
                            {tw('education.lessonsDoneCount', { count: progress.completed_lessons })}
                          </Text>
                        </View>
                        <View style={styles.courseStat}>
                          <MaterialCommunityIcons name="clock-outline" size={16} color="#666" />
                          <Text variant="bodySmall" style={styles.courseStatText}>
                            {tw('education.lessonsLeftCount', {
                              count: progress.total_lessons - progress.completed_lessons,
                            })}
                          </Text>
                        </View>
                      </View>

                      {/* Share Buttons */}
                      <View style={styles.shareSection}>
                        <Text variant="bodySmall" style={styles.shareLabel}>
                          {t('education.shareEarn')}
                        </Text>
                        <View style={styles.shareButtons}>
                          <IconButton
                            icon="share-variant"
                            size={20}
                            iconColor="#3534C9"
                            onPress={() => handleShareCourse(enrollment.course.id, enrollment.course.title)}
                            style={styles.shareButton}
                          />
                          <IconButton
                            icon="facebook"
                            size={20}
                            iconColor="#1877f2"
                            onPress={() => handleShareCourse(enrollment.course.id, enrollment.course.title, 'facebook')}
                            style={styles.shareButton}
                          />
                          <IconButton
                            icon="twitter"
                            size={20}
                            iconColor="#1da1f2"
                            onPress={() => handleShareCourse(enrollment.course.id, enrollment.course.title, 'twitter')}
                            style={styles.shareButton}
                          />
                          <IconButton
                            icon="whatsapp"
                            size={20}
                            iconColor="#25d366"
                            onPress={() => handleShareCourse(enrollment.course.id, enrollment.course.title, 'whatsapp')}
                            style={styles.shareButton}
                          />
                          <IconButton
                            icon="instagram"
                            size={20}
                            iconColor="#e4405f"
                            onPress={() => handleShareCourse(enrollment.course.id, enrollment.course.title, 'instagram')}
                            style={styles.shareButton}
                          />
                          <IconButton
                            icon="music-note"
                            size={20}
                            iconColor="#000000"
                            onPress={() => handleShareCourse(enrollment.course.id, enrollment.course.title, 'tiktok')}
                            style={styles.shareButton}
                          />
                          <IconButton
                            icon="pinterest"
                            size={20}
                            iconColor="#bd081c"
                            onPress={() => handleShareCourse(enrollment.course.id, enrollment.course.title, 'pinterest')}
                            style={styles.shareButton}
                          />
                        </View>
                      </View>
                    </Card.Content>
                  </Card>
                </TouchableOpacity>
              )
            })}
              {activeEnrollments.length > 0 && (
                <Button
                  mode="outlined"
                  onPress={() => navigation.navigate('CourseList')}
                  style={styles.exploreButton}
                  icon="book-open-outline"
                >
                  {t('education.exploreMore')}
                </Button>
              )}
            </>
          )}
        </View>

        {/* Pending Enrollments Section */}
        {pendingEnrollments.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text variant="titleMedium" style={styles.sectionTitle}>
                {t('education.pendingSection')}
              </Text>
              <Chip icon="clock" compact style={styles.countChip}>
                {pendingEnrollments.length}
              </Chip>
            </View>
            {pendingEnrollments.map((enrollment) => {
              const hasProof = !!enrollment.payment_proof
              const proofStatus = enrollment.payment_proof?.status
              const isUploading = uploadingId === enrollment.id || feedback.isPending(`upload-${enrollment.id}`)
              return (
                <Card key={enrollment.id} style={styles.pendingCard}>
                  <Card.Content>
                    <View style={styles.pendingHeader}>
                      <MaterialCommunityIcons name="book-open" size={24} color="#f59e0b" />
                      <View style={styles.pendingInfo}>
                        <Text variant="titleMedium" style={styles.pendingTitle}>
                          {enrollment.course.title}
                        </Text>
                        <Text variant="bodySmall" style={styles.pendingDate}>
                          {tw('education.enrolledOn', {
                            date: new Date(enrollment.enrolled_at).toLocaleDateString(dateLoc),
                          })}
                        </Text>
                      </View>
                    </View>
                    {!hasProof ? (
                      <View style={styles.paymentInfo}>
                        <Text variant="bodySmall" style={styles.paymentLabel}>
                          {t('education.paymentInstructions')}
                        </Text>
                        <Text variant="bodySmall" style={styles.paymentText}>
                          {t('education.ibanLabel')} {paymentInfo?.iban ?? '—'}
                        </Text>
                        <Text variant="bodySmall" style={styles.paymentText}>
                          {t('education.beneficiary')} {paymentInfo?.payee_name ?? '—'}
                        </Text>
                        <Text variant="bodySmall" style={styles.paymentText}>
                          {t('education.amount')} {enrollment.course.price || t('education.priceOnRequest')}
                        </Text>
                        <TextInput
                          label={t('education.notesOptional')}
                          value={uploadNotes[enrollment.id] || ''}
                          onChangeText={(text) =>
                            setUploadNotes((prev) => ({ ...prev, [enrollment.id]: text }))
                          }
                          mode="outlined"
                          style={styles.notesInput}
                          multiline
                          numberOfLines={2}
                        />
                        <Button
                          mode="contained"
                          onPress={() => handleUploadPaymentProof(enrollment.id)}
                          loading={isUploading}
                          disabled={isUploading}
                          style={styles.uploadButton}
                          icon="upload"
                        >
                          {isUploading ? t('feedback.uploading') : t('education.uploadProof')}
                        </Button>
                      </View>
                    ) : proofStatus === 'pending' ? (
                      <View style={styles.pendingStatus}>
                        <MaterialCommunityIcons name="clock-outline" size={24} color="#f59e0b" />
                        <Text variant="bodyMedium" style={styles.pendingStatusText}>
                          {t('education.proofAwaiting')}
                        </Text>
                      </View>
                    ) : proofStatus === 'rejected' ? (
                      <View style={styles.paymentInfo}>
                        <View style={styles.rejectedStatus}>
                          <MaterialCommunityIcons name="alert-circle" size={24} color="#ef4444" />
                          <Text variant="bodyMedium" style={styles.rejectedText}>
                            {t('education.proofRejectedMsg')}
                          </Text>
                        </View>
                        <TextInput
                          label={t('education.notesOptional')}
                          value={uploadNotes[enrollment.id] || ''}
                          onChangeText={(text) =>
                            setUploadNotes((prev) => ({ ...prev, [enrollment.id]: text }))
                          }
                          mode="outlined"
                          style={styles.notesInput}
                          multiline
                          numberOfLines={2}
                        />
                        <Button
                          mode="contained"
                          onPress={() => handleUploadPaymentProof(enrollment.id)}
                          loading={isUploading}
                          disabled={isUploading}
                          style={styles.uploadButton}
                          icon="upload"
                        >
                          {isUploading ? t('feedback.uploading') : t('education.uploadAgain')}
                        </Button>
                      </View>
                    ) : null}
                  </Card.Content>
                </Card>
              )
            })}
          </View>
        )}

        {/* Recent Lessons Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text variant="titleMedium" style={styles.sectionTitle}>
              {t('education.recentLessons')}
            </Text>
          </View>

          {recentLessons.length === 0 ? (
            <Card style={styles.card}>
              <Card.Content style={styles.emptyContent}>
                <MaterialCommunityIcons name="play-circle-outline" size={64} color="#ccc" />
                <Text variant="bodyLarge" style={styles.emptyText}>
                  {t('education.noRecentLessons')}
                </Text>
                <Text variant="bodySmall" style={styles.emptySubtext}>
                  {t('education.noRecentLessonsHint')}
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
                            color={lesson.progress?.completed ? "#4DB83D" : "#3534C9"}
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
                                {tw('education.minutesShort', { count: Math.floor(lesson.duration / 60) })}
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
                          {t('education.lessonDone')}
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
    borderLeftColor: '#4DB83D',
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
    color: '#3534C9',
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
    color: '#3534C9',
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
    color: '#4DB83D',
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
  exploreButton: {
    marginTop: 12,
  },
  pendingCard: {
    marginBottom: 12,
    borderRadius: 12,
    elevation: 2,
    borderLeftWidth: 4,
    borderLeftColor: '#f59e0b',
  },
  pendingHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  pendingInfo: {
    flex: 1,
    marginLeft: 12,
  },
  pendingTitle: {
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
  },
  pendingDate: {
    color: '#666',
    fontSize: 12,
  },
  paymentInfo: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  paymentLabel: {
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 8,
  },
  paymentText: {
    color: '#666',
    fontSize: 12,
    marginBottom: 4,
    fontFamily: 'monospace',
  },
  notesInput: {
    marginTop: 12,
    marginBottom: 12,
  },
  uploadButton: {
    marginTop: 4,
  },
  pendingStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
    padding: 12,
    backgroundColor: '#fef3c7',
    borderRadius: 8,
  },
  pendingStatusText: {
    color: '#92400e',
    flex: 1,
  },
  rejectedStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
    padding: 12,
    backgroundColor: '#fee2e2',
    borderRadius: 8,
  },
  rejectedText: {
    color: '#991b1b',
    flex: 1,
  },
  pointsSection: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  pointsCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef3c7',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
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
  pointsKz: {
    color: '#a16207',
    marginTop: 2,
  },
  pointsHint: {
    color: '#666',
    fontSize: 11,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  shareSection: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  shareLabel: {
    color: '#666',
    marginBottom: 8,
    fontSize: 12,
  },
  shareButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
    gap: 4,
  },
  shareButton: {
    margin: 0,
    backgroundColor: '#f5f5f5',
  },
})
