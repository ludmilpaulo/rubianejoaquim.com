import React, { useState, useEffect } from 'react'
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native'
import { Text, Card, Button, RadioButton, Divider } from 'react-native-paper'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRoute, useNavigation } from '@react-navigation/native'
import { lessonQuizApi, lessonsApi } from '../services/api'

interface RouteParams {
  lessonId: number
  quizId: number
}

interface Choice {
  id: number
  choice_text: string
  order?: number
}

interface QuestionItem {
  id: number
  question: {
    id: number
    question_text: string
    choices: Choice[]
  }
}

interface Quiz {
  id: number
  title: string
  passing_score: number
  questions: QuestionItem[]
}

export default function LessonQuizScreen() {
  const route = useRoute()
  const navigation = useNavigation<any>()
  const { lessonId, quizId } = (route.params as RouteParams) || {}
  const [quiz, setQuiz] = useState<Quiz | null>(null)
  const [loading, setLoading] = useState(true)
  const [answers, setAnswers] = useState<Record<number, number>>({})
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState<{
    score: number
    passed: boolean
    correct_answers: number
    total_questions: number
  } | null>(null)

  useEffect(() => {
    if (lessonId) loadQuiz()
  }, [lessonId])

  const loadQuiz = async () => {
    try {
      setLoading(true)
      const data = await lessonQuizApi.getByLesson(lessonId)
      const quizData = data && (data.quiz !== undefined ? data.quiz : data)
      if (quizData?.id) setQuiz(quizData)
      else setQuiz(null)
    } catch (e) {
      console.error('Error loading quiz:', e)
      setQuiz(null)
    } finally {
      setLoading(false)
    }
  }

  const handleSelectAnswer = (questionId: number, choiceId: number) => {
    setAnswers(prev => ({ ...prev, [questionId]: choiceId }))
  }

  const handleSubmit = async () => {
    if (!quiz) return
    const questions = quiz.questions || []
    if (questions.length === 0) {
      Alert.alert('Atenção', 'Este quiz não tem perguntas configuradas.')
      return
    }
    const answerList = questions.map(q => ({
      question_id: q.question.id,
      choice_id: answers[q.question.id],
    })).filter(a => a.choice_id != null)
    if (answerList.length !== questions.length) {
      Alert.alert('Atenção', 'Responda a todas as perguntas antes de enviar.')
      return
    }
    setSubmitting(true)
    try {
      const res = await lessonQuizApi.submit(quiz.id, answerList)
      const data = res && (res as any).data !== undefined ? (res as any).data : res
      const passed = !!(data?.passed ?? data?.score >= (quiz.passing_score ?? 0))
      setResult({
        score: Number(data?.score ?? 0),
        passed,
        correct_answers: Number(data?.correct_answers ?? 0),
        total_questions: Number(data?.total_questions ?? questions.length),
      })
      if (passed && lessonId) {
        await lessonsApi.markCompleted(lessonId)
      }
    } catch (err: any) {
      const msg = err?.response?.data?.error ?? err?.message ?? 'Erro ao enviar quiz.'
      Alert.alert('Erro', msg)
    } finally {
      setSubmitting(false)
    }
  }

  const handleBack = () => {
    navigation.goBack()
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#6366f1" />
          <Text variant="bodyLarge" style={styles.loadingText}>Carregando quiz...</Text>
        </View>
      </SafeAreaView>
    )
  }

  if (!quiz) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.centered}>
          <MaterialCommunityIcons name="file-question-outline" size={64} color="#9ca3af" />
          <Text variant="titleMedium" style={styles.errorText}>Quiz não encontrado.</Text>
          <Button mode="contained" onPress={handleBack} style={styles.backButton}>
            Voltar
          </Button>
        </View>
      </SafeAreaView>
    )
  }

  const questions = quiz.questions || []
  const hasNoQuestions = questions.length === 0

  if (hasNoQuestions) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.centered}>
          <MaterialCommunityIcons name="file-question-outline" size={64} color="#9ca3af" />
          <Text variant="titleMedium" style={styles.errorText}>Este quiz não tem perguntas configuradas.</Text>
          <Button mode="contained" onPress={handleBack} style={styles.backButton}>
            Voltar à aula
          </Button>
        </View>
      </SafeAreaView>
    )
  }

  const allAnswered = questions.every(q => answers[q.question.id] != null)

  if (result !== null) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ScrollView contentContainerStyle={styles.resultContainer}>
          <Card style={[styles.resultCard, result.passed ? styles.resultPassedCard : styles.resultFailedCard]}>
            <Card.Content>
              <View style={styles.resultIconWrap}>
                <MaterialCommunityIcons
                  name={result.passed ? 'check-circle' : 'close-circle'}
                  size={72}
                  color={result.passed ? '#10b981' : '#ef4444'}
                />
              </View>
              <Text variant="headlineSmall" style={styles.resultTitle}>
                {result.passed ? 'Parabéns! Você passou.' : 'Não atingiu a nota mínima'}
              </Text>
              <Text variant="titleLarge" style={[styles.resultScore, result.passed ? styles.scorePassed : styles.scoreFailed]}>
                {result.score.toFixed(1)}%
              </Text>
              <Text variant="bodyLarge" style={styles.resultDetail}>
                {result.correct_answers} de {result.total_questions} respostas corretas
              </Text>
              <Text variant="bodyMedium" style={styles.passingText}>
                Nota mínima: {quiz.passing_score}%
              </Text>
              <Button mode="contained" onPress={handleBack} style={styles.backButton}>
                Voltar à aula
              </Button>
            </Card.Content>
          </Card>
        </ScrollView>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <Card style={styles.headerCard}>
          <Card.Content>
            <Text variant="titleLarge" style={styles.quizTitle}>{quiz.title}</Text>
            <Text variant="bodyMedium" style={styles.quizMeta}>
              {questions.length} pergunta{questions.length !== 1 ? 's' : ''} • Mínimo: {quiz.passing_score}%
            </Text>
          </Card.Content>
        </Card>

        {questions.map((qq, index) => {
          const q = qq.question
          const selected = answers[q.id]
          return (
            <Card key={q.id} style={styles.questionCard}>
              <Card.Content>
                <Text variant="titleMedium" style={styles.questionLabel}>
                  {index + 1}. {q.question_text}
                </Text>
                <RadioButton.Group
                  onValueChange={val => handleSelectAnswer(q.id, Number(val))}
                  value={selected != null ? String(selected) : ''}
                >
                  {(q.choices || []).sort((a, b) => (a.order ?? 0) - (b.order ?? 0)).map(choice => (
                    <TouchableOpacity
                      key={choice.id}
                      style={styles.choiceRow}
                      onPress={() => handleSelectAnswer(q.id, choice.id)}
                      activeOpacity={0.7}
                    >
                      <RadioButton.Android value={String(choice.id)} color="#6366f1" />
                      <Text variant="bodyLarge" style={styles.choiceText}>{choice.choice_text}</Text>
                    </TouchableOpacity>
                  ))}
                </RadioButton.Group>
              </Card.Content>
            </Card>
          )
        })}

        <View style={styles.progressWrap}>
          <Text variant="bodyMedium" style={styles.progressText}>
            Respondidas: {Object.keys(answers).length} / {questions.length}
          </Text>
        </View>

        <Button
          mode="contained"
          onPress={handleSubmit}
          loading={submitting}
          disabled={submitting || !allAnswered}
          style={styles.submitButton}
        >
          {submitting ? 'A enviar...' : 'Enviar respostas'}
        </Button>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#f5f5f5' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  loadingText: { marginTop: 12, color: '#666' },
  errorText: { marginTop: 12, marginBottom: 24, color: '#666', textAlign: 'center' },
  container: { flex: 1 },
  content: { padding: 16, paddingBottom: 32 },
  headerCard: { marginBottom: 16, borderRadius: 12, elevation: 2 },
  quizTitle: { fontWeight: '700', color: '#1f2937' },
  quizMeta: { marginTop: 4, color: '#6b7280' },
  questionCard: { marginBottom: 12, borderRadius: 12, elevation: 2 },
  questionLabel: { marginBottom: 12, color: '#374151', fontWeight: '600' },
  choiceRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8 },
  choiceText: { flex: 1, color: '#1f2937', marginLeft: 8 },
  progressWrap: { marginVertical: 16, alignItems: 'center' },
  progressText: { color: '#6b7280' },
  submitButton: { marginTop: 8 },
  backButton: { marginTop: 24 },
  resultContainer: { padding: 16, flexGrow: 1 },
  resultCard: { borderRadius: 16, elevation: 4, overflow: 'hidden' },
  resultPassedCard: { borderWidth: 2, borderColor: '#10b981', backgroundColor: '#f0fdf4' },
  resultFailedCard: { borderWidth: 2, borderColor: '#ef4444', backgroundColor: '#fef2f2' },
  resultIconWrap: { alignItems: 'center', marginBottom: 16 },
  resultTitle: { textAlign: 'center', fontWeight: '700', color: '#1f2937', marginBottom: 8 },
  resultScore: { textAlign: 'center', fontWeight: '800', marginBottom: 8 },
  scorePassed: { color: '#10b981' },
  scoreFailed: { color: '#ef4444' },
  resultDetail: { textAlign: 'center', color: '#4b5563', marginBottom: 4 },
  passingText: { textAlign: 'center', color: '#6b7280', marginBottom: 16 },
})
