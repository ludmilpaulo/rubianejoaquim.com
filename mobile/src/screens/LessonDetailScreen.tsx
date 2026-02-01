import React, { useState, useEffect, useRef } from 'react'
import { View, StyleSheet, ScrollView, Linking, TouchableOpacity, Alert, Dimensions } from 'react-native'
import { Text, Card, Button, Chip, Divider } from 'react-native-paper'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRoute, useNavigation } from '@react-navigation/native'
import YoutubePlayer from 'react-native-youtube-iframe'
import { lessonsApi, lessonQuizApi } from '../services/api'
import { extractYouTubeVideoId, isYouTubeUrl } from '../utils/youtube'

const { width } = Dimensions.get('window')
const VIDEO_HEIGHT = (width - 32) * 9 / 16 // 16:9 aspect ratio

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
  content: string
  video_url: string | null
  duration: number | null
  is_free: boolean
  order: number
  attachments: Array<{
    id: number
    title: string
    file_url: string
    file_type: string
    description: string
  }>
  progress?: {
    completed: boolean
    completed_at: string | null
  } | null
}

interface RouteParams {
  lessonId: number
}

export default function LessonDetailScreen() {
  const route = useRoute()
  const navigation = useNavigation<any>()
  const { lessonId } = (route.params as RouteParams) || {}
  const [lesson, setLesson] = useState<Lesson | null>(null)
  const [loading, setLoading] = useState(true)
  const [markingComplete, setMarkingComplete] = useState(false)
  const [playing, setPlaying] = useState(false)
  const playerRef = useRef<any>(null)
  const [quiz, setQuiz] = useState<any | null>(null)
  const [loadingQuiz, setLoadingQuiz] = useState(false)
  
  // Extract YouTube video ID if it's a YouTube URL
  const videoId = lesson?.video_url && isYouTubeUrl(lesson.video_url) 
    ? extractYouTubeVideoId(lesson.video_url) 
    : null

  useEffect(() => {
    if (lessonId) {
      loadLesson()
    }
  }, [lessonId])

  useEffect(() => {
    // Load quiz when lesson is completed
    if (lesson && lesson.progress?.completed) {
      loadQuiz()
    }
  }, [lesson?.progress?.completed])

  const loadLesson = async () => {
    try {
      setLoading(true)
      const response = await lessonsApi.get(lessonId)
      // Handle response - could be direct data or wrapped
      const lessonData = response.data || response
      setLesson(lessonData)
    } catch (error) {
      console.error('Error loading lesson:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadQuiz = async () => {
    if (!lessonId) return
    try {
      setLoadingQuiz(true)
      const data = await lessonQuizApi.getByLesson(lessonId)
      setQuiz(data)
    } catch (error) {
      console.error('Error loading quiz:', error)
      setQuiz(null)
    } finally {
      setLoadingQuiz(false)
    }
  }

  const handleMarkComplete = async () => {
    if (!lesson) return
    
    try {
      setMarkingComplete(true)
      await lessonsApi.markCompleted(lesson.id)
      // Reload lesson to get updated progress
      await loadLesson()
    } catch (error: any) {
      console.error('Error marking lesson as complete:', error)
      Alert.alert('Erro', error.response?.data?.error || 'Erro ao marcar aula como concluída')
    } finally {
      setMarkingComplete(false)
    }
  }

  const handleOpenAttachment = (url: string) => {
    Linking.openURL(url).catch(err => console.error('Error opening attachment:', err))
  }

  const handleOpenVideo = (url: string) => {
    // If it's not a YouTube URL, open in browser
    if (!isYouTubeUrl(url)) {
      Linking.openURL(url).catch(err => console.error('Error opening video:', err))
    }
    // YouTube videos are played in-app automatically
  }

  const onStateChange = (state: string) => {
    // Handle video state changes
    if (state === 'playing') {
      setPlaying(true)
    } else if (state === 'paused' || state === 'ended') {
      setPlaying(false)
    }
    
    // Optionally mark as complete when video ends
    if (state === 'ended' && lesson && !lesson.progress?.completed) {
      // Auto-complete lesson when video finishes (optional)
      // handleMarkComplete()
    }
  }

  if (loading || !lesson) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.loadingContainer}>
          <Text>Carregando...</Text>
        </View>
      </SafeAreaView>
    )
  }

  const isCompleted = lesson.progress?.completed || false

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView style={styles.container}>
        {/* Header */}
        <Card style={styles.headerCard}>
          <Card.Content>
            <View style={styles.headerTop}>
              <View style={styles.courseBadge}>
                <MaterialCommunityIcons name="book" size={16} color="#6366f1" />
                <Text variant="bodySmall" style={styles.courseName}>
                  {lesson.course.title}
                </Text>
              </View>
              {isCompleted && (
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
            <Text variant="headlineSmall" style={styles.lessonTitle}>
              {lesson.title}
            </Text>
            {lesson.description && (
              <Text variant="bodyMedium" style={styles.lessonDescription}>
                {lesson.description}
              </Text>
            )}
            <View style={styles.lessonMeta}>
              {lesson.duration && (
                <View style={styles.metaItem}>
                  <MaterialCommunityIcons name="clock-outline" size={16} color="#666" />
                  <Text variant="bodySmall" style={styles.metaText}>
                    {Math.floor(lesson.duration / 60)} minutos
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
                  Aula Grátis
                </Chip>
              )}
            </View>
          </Card.Content>
        </Card>

        {/* Video Section */}
        {lesson.video_url && (
          <Card style={styles.card}>
            <Card.Content>
              <View style={styles.videoHeader}>
                <MaterialCommunityIcons name="play-circle" size={24} color="#6366f1" />
                <Text variant="titleMedium" style={styles.sectionTitle}>
                  Vídeo da Aula
                </Text>
              </View>
              
              {videoId ? (
                // YouTube video - play in-app
                <View style={styles.videoContainer}>
                  <YoutubePlayer
                    ref={playerRef}
                    height={VIDEO_HEIGHT}
                    width={width - 32}
                    videoId={videoId}
                    play={playing}
                    onChangeState={onStateChange}
                    webViewStyle={styles.youtubeWebView}
                    webViewProps={{
                      allowsFullscreenVideo: true,
                      mediaPlaybackRequiresUserAction: false,
                    }}
                    initialPlayerParams={{
                      modestbranding: true,
                      rel: false,
                      controls: true,
                    }}
                  />
                </View>
              ) : (
                // Non-YouTube video - show button to open in browser
                <Button
                  mode="contained"
                  icon="play"
                  onPress={() => handleOpenVideo(lesson.video_url!)}
                  style={styles.videoButton}
                >
                  Assistir Vídeo
                </Button>
              )}
            </Card.Content>
          </Card>
        )}

        {/* Content Section */}
        {lesson.content && (
          <Card style={styles.card}>
            <Card.Content>
              <Text variant="titleMedium" style={styles.sectionTitle}>
                Conteúdo da Aula
              </Text>
              <Divider style={styles.divider} />
              <View style={styles.contentContainer}>
                <Text variant="bodyMedium" style={styles.contentText}>
                  {lesson.content}
                </Text>
              </View>
            </Card.Content>
          </Card>
        )}

        {/* Attachments Section */}
        {lesson.attachments && lesson.attachments.length > 0 && (
          <Card style={styles.card}>
            <Card.Content>
              <View style={styles.attachmentsHeader}>
                <MaterialCommunityIcons name="file-document" size={24} color="#6366f1" />
                <Text variant="titleMedium" style={styles.sectionTitle}>
                  Materiais de Apoio
                </Text>
              </View>
              <Divider style={styles.divider} />
              {lesson.attachments.map(attachment => (
                <TouchableOpacity
                  key={attachment.id}
                  onPress={() => handleOpenAttachment(attachment.file_url)}
                  style={styles.attachmentItem}
                >
                  <View style={styles.attachmentLeft}>
                    <View style={styles.attachmentIcon}>
                      <MaterialCommunityIcons
                        name={attachment.file_type === 'pdf' ? 'file-pdf-box' : 'file'}
                        size={24}
                        color="#6366f1"
                      />
                    </View>
                    <View style={styles.attachmentInfo}>
                      <Text variant="titleSmall" style={styles.attachmentTitle}>
                        {attachment.title}
                      </Text>
                      {attachment.description && (
                        <Text variant="bodySmall" style={styles.attachmentDescription}>
                          {attachment.description}
                        </Text>
                      )}
                    </View>
                  </View>
                  <MaterialCommunityIcons name="download" size={24} color="#6366f1" />
                </TouchableOpacity>
              ))}
            </Card.Content>
          </Card>
        )}

        {/* Complete Button */}
        {!isCompleted && (
          <Card style={styles.card}>
            <Card.Content>
              <Button
                mode="contained"
                icon="check-circle"
                onPress={handleMarkComplete}
                loading={markingComplete}
                disabled={markingComplete}
                style={styles.completeButton}
              >
                Marcar como Concluída
              </Button>
            </Card.Content>
          </Card>
        )}

        {/* Completion Message */}
        {isCompleted && lesson.progress?.completed_at && (
          <Card style={[styles.card, styles.completedCard]}>
            <Card.Content>
              <View style={styles.completedMessage}>
                <MaterialCommunityIcons name="check-circle" size={48} color="#10b981" />
                <Text variant="titleLarge" style={styles.completedTitle}>
                  Aula Concluída!
                </Text>
                <Text variant="bodyMedium" style={styles.completedText}>
                  Parabéns! Você completou esta aula em{' '}
                  {new Date(lesson.progress.completed_at).toLocaleDateString('pt-PT')}
                </Text>
              </View>
            </Card.Content>
          </Card>
        )}

        {/* Quiz Section - Show after lesson completion */}
        {isCompleted && (
          <Card style={styles.card}>
            <Card.Content>
              <View style={styles.quizHeader}>
                <MaterialCommunityIcons name="file-question" size={24} color="#6366f1" />
                <Text variant="titleMedium" style={styles.sectionTitle}>
                  Quiz da Aula
                </Text>
              </View>
              <Divider style={styles.divider} />
              {loadingQuiz ? (
                <View style={styles.quizLoading}>
                  <Text variant="bodyMedium" style={styles.quizLoadingText}>
                    Carregando quiz...
                  </Text>
                </View>
              ) : quiz && quiz.quiz ? (
                <View style={styles.quizContent}>
                  <Text variant="bodyLarge" style={styles.quizTitle}>
                    {quiz.quiz.title || 'Quiz da Aula'}
                  </Text>
                  {quiz.quiz.questions && quiz.quiz.questions.length > 0 && (
                    <Text variant="bodyMedium" style={styles.quizInfo}>
                      {quiz.quiz.questions.length} pergunta{quiz.quiz.questions.length > 1 ? 's' : ''}
                      {quiz.quiz.passing_score && ` • Nota mínima: ${quiz.quiz.passing_score}%`}
                    </Text>
                  )}
                  {quiz.previous_result ? (
                    <View style={styles.quizResult}>
                      <View style={styles.resultRow}>
                        <Text variant="bodyMedium" style={styles.resultLabel}>
                          Pontuação:
                        </Text>
                        <Text variant="titleMedium" style={[
                          styles.resultValue,
                          quiz.previous_result.passed ? styles.resultPassed : styles.resultFailed
                        ]}>
                          {quiz.previous_result.score.toFixed(1)}%
                        </Text>
                      </View>
                      <View style={styles.resultRow}>
                        <Text variant="bodyMedium" style={styles.resultLabel}>
                          Respostas corretas:
                        </Text>
                        <Text variant="bodyMedium" style={styles.resultValue}>
                          {quiz.previous_result.correct_answers} / {quiz.previous_result.total_questions}
                        </Text>
                      </View>
                      {quiz.previous_result.passed ? (
                        <Chip
                          icon="check-circle"
                          style={styles.passedChip}
                          textStyle={styles.passedChipText}
                        >
                          Aprovado
                        </Chip>
                      ) : (
                        <Chip
                          icon="alert-circle"
                          style={styles.failedChip}
                          textStyle={styles.failedChipText}
                        >
                          Não Aprovado
                        </Chip>
                      )}
                    </View>
                  ) : (
                    <Button
                      mode="contained"
                      icon="play-circle"
                      onPress={() => {
                        navigation.navigate('LessonQuiz', { 
                          lessonId: lesson.id,
                          quizId: quiz.quiz.id 
                        })
                      }}
                      style={styles.startQuizButton}
                    >
                      Iniciar Quiz
                    </Button>
                  )}
                </View>
              ) : (
                <View style={styles.noQuiz}>
                  <MaterialCommunityIcons name="file-question-outline" size={48} color="#9ca3af" />
                  <Text variant="bodyMedium" style={styles.noQuizText}>
                    Esta aula não possui quiz disponível.
                  </Text>
                </View>
              )}
            </Card.Content>
          </Card>
        )}
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerCard: {
    margin: 16,
    borderRadius: 16,
    elevation: 4,
    backgroundColor: '#fff',
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  courseBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#eef2ff',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 6,
  },
  courseName: {
    color: '#6366f1',
    fontWeight: '600',
  },
  completedChip: {
    backgroundColor: '#d1fae5',
    height: 28,
  },
  completedChipText: {
    fontSize: 11,
    color: '#10b981',
  },
  lessonTitle: {
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 8,
  },
  lessonDescription: {
    color: '#666',
    marginBottom: 12,
  },
  lessonMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flexWrap: 'wrap',
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    color: '#666',
  },
  freeChip: {
    backgroundColor: '#dbeafe',
    height: 24,
  },
  freeChipText: {
    fontSize: 11,
    color: '#2563eb',
  },
  card: {
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
    elevation: 2,
  },
  videoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  sectionTitle: {
    fontWeight: '600',
    color: '#1f2937',
  },
  videoButton: {
    marginTop: 8,
  },
  videoContainer: {
    marginTop: 12,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#000',
    position: 'relative',
  },
  youtubeWebView: {
    backgroundColor: '#000',
  },
  divider: {
    marginVertical: 12,
  },
  contentContainer: {
    marginTop: 8,
  },
  contentText: {
    color: '#1f2937',
    lineHeight: 24,
  },
  attachmentsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  attachmentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  attachmentLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  attachmentIcon: {
    marginRight: 12,
  },
  attachmentInfo: {
    flex: 1,
  },
  attachmentTitle: {
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
  },
  attachmentDescription: {
    color: '#666',
  },
  completeButton: {
    marginTop: 8,
  },
  completedCard: {
    backgroundColor: '#f0fdf4',
    borderWidth: 2,
    borderColor: '#10b981',
  },
  completedMessage: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  completedTitle: {
    fontWeight: 'bold',
    color: '#10b981',
    marginTop: 12,
    marginBottom: 8,
  },
  completedText: {
    color: '#666',
    textAlign: 'center',
  },
  quizHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  quizLoading: {
    paddingVertical: 24,
    alignItems: 'center',
  },
  quizLoadingText: {
    color: '#666',
  },
  quizContent: {
    marginTop: 8,
  },
  quizTitle: {
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 8,
  },
  quizInfo: {
    color: '#666',
    marginBottom: 16,
  },
  quizResult: {
    backgroundColor: '#f9fafb',
    padding: 16,
    borderRadius: 8,
    marginTop: 8,
  },
  resultRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  resultLabel: {
    color: '#666',
  },
  resultValue: {
    fontWeight: '600',
    color: '#1f2937',
  },
  resultPassed: {
    color: '#10b981',
  },
  resultFailed: {
    color: '#ef4444',
  },
  passedChip: {
    backgroundColor: '#d1fae5',
    marginTop: 8,
    alignSelf: 'flex-start',
  },
  passedChipText: {
    color: '#10b981',
    fontSize: 12,
  },
  failedChip: {
    backgroundColor: '#fee2e2',
    marginTop: 8,
    alignSelf: 'flex-start',
  },
  failedChipText: {
    color: '#ef4444',
    fontSize: 12,
  },
  startQuizButton: {
    marginTop: 8,
  },
  noQuiz: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  noQuizText: {
    color: '#9ca3af',
    marginTop: 12,
    textAlign: 'center',
  },
})
