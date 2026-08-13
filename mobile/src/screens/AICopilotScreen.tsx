import React, { useState, useEffect, useRef } from 'react'
import { View, StyleSheet, ScrollView, KeyboardAvoidingView, Platform, TextInput as RNTextInput, Animated, TouchableOpacity } from 'react-native'
import { Text, TextInput, Button, Card } from 'react-native-paper'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useNavigation, useRoute } from '@react-navigation/native'
import { aiCopilotApi } from '../services/api'
import { useI18n } from '../contexts/I18nContext'
import { formatTime } from '../i18n/format'
import ZendaCard from '../components/ui/ZendaCard'
import { ZendaLoader, ZendaLoading } from '../components/ui/ZendaLoader'
import { useActionFeedback } from '../hooks/useActionFeedback'
import { colors, spacing, typography } from '../theme'
import { logger } from '../utils/logger'
import { ChatMessageDto, getApiErrorMessage, isApiError } from '../types/api'

interface Message {
  id?: number
  role: 'user' | 'assistant' | 'system'
  content: string
  created_at?: string
}

interface RouteParams {
  conversationId?: number
}

export default function AICopilotScreen() {
  const { t, locale, messages: localeMessages } = useI18n()
  const feedback = useActionFeedback()
  const navigation = useNavigation<{ goBack: () => void }>()
  const route = useRoute()
  const { conversationId: initialConversationId } = (route.params as RouteParams) || {}
  
  const [messages, setMessages] = useState<Message[]>([])
  const [inputText, setInputText] = useState('')
  const [loading, setLoading] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [conversationId, setConversationId] = useState<number | null>(initialConversationId || null)
  const chatPending = feedback.isPending('chat')
  const reportPending = feedback.isPending('report')
  const sending = chatPending || reportPending
  const scrollViewRef = useRef<ScrollView>(null)
  const inputRef = useRef<RNTextInput>(null)
  const dot1Anim = useRef(new Animated.Value(0.4)).current
  const dot2Anim = useRef(new Animated.Value(0.4)).current
  const dot3Anim = useRef(new Animated.Value(0.4)).current
  const [insights, setInsights] = useState<{
    health_score?: number
    grade?: string
    monthly_report?: string
    suggested_prompts?: string[]
  } | null>(null)

  useEffect(() => {
    aiCopilotApi.getInsights().then(setInsights).catch(() => setInsights(null))
  }, [])

  const suggestionList =
    insights?.suggested_prompts?.length
      ? insights.suggested_prompts
      : localeMessages.ai.suggestions

  // Typing animation
  useEffect(() => {
    if (sending) {
      const animateDots = () => {
        Animated.sequence([
          Animated.parallel([
            Animated.timing(dot1Anim, { toValue: 1, duration: 400, useNativeDriver: true }),
            Animated.timing(dot2Anim, { toValue: 0.4, duration: 400, useNativeDriver: true }),
            Animated.timing(dot3Anim, { toValue: 0.4, duration: 400, useNativeDriver: true }),
          ]),
          Animated.parallel([
            Animated.timing(dot1Anim, { toValue: 0.4, duration: 400, useNativeDriver: true }),
            Animated.timing(dot2Anim, { toValue: 1, duration: 400, useNativeDriver: true }),
            Animated.timing(dot3Anim, { toValue: 0.4, duration: 400, useNativeDriver: true }),
          ]),
          Animated.parallel([
            Animated.timing(dot1Anim, { toValue: 0.4, duration: 400, useNativeDriver: true }),
            Animated.timing(dot2Anim, { toValue: 0.4, duration: 400, useNativeDriver: true }),
            Animated.timing(dot3Anim, { toValue: 1, duration: 400, useNativeDriver: true }),
          ]),
        ]).start(() => {
          if (sending) animateDots()
        })
      }
      animateDots()
    } else {
      dot1Anim.setValue(0.4)
      dot2Anim.setValue(0.4)
      dot3Anim.setValue(0.4)
    }
  }, [sending])

  useEffect(() => {
    if (conversationId) {
      loadConversation()
    }
    // Welcome message is now shown in the UI when messages.length === 0
  }, [conversationId])

  const loadConversation = async () => {
    if (!conversationId) return
    
    try {
      setLoading(true)
      setLoadError(null)
      const response = await aiCopilotApi.getConversation(conversationId)
      // Handle response - could be direct data or wrapped
      const conversation = response.data || response
      if (conversation.messages) {
        const messagesData = Array.isArray(conversation.messages) 
          ? conversation.messages 
          : conversation.messages.results || []
        // Ensure messages have correct format
        const formattedMessages: Message[] = messagesData.map((msg: ChatMessageDto & { message?: string }) => ({
          id: msg.id,
          role: msg.role || 'assistant',
          content: msg.content || msg.message || '',
          created_at: msg.created_at,
        }))
        setMessages(formattedMessages)
      }
    } catch (error: unknown) {
      logger.error('Error loading conversation:', error)
      let errorMsg = t('aiErrors.loadConversation')
      if (isApiError(error) && error.response?.status === 404) {
        errorMsg = t('aiErrors.conversationNotFound')
      } else if (isApiError(error) && error.response?.status === 401) {
        errorMsg = t('aiErrors.sessionExpired')
      }
      setLoadError(errorMsg)
      setMessages([{
        role: 'assistant',
        content: errorMsg
      }])
    } finally {
      setLoading(false)
    }
  }

  const loadReport = (type: 'monthly' | 'savings' | 'debt') => {
    void feedback.run(
      async () => {
        let text = ''
        if (type === 'monthly') {
          const r = await aiCopilotApi.getMonthlyReport()
          text = r.report || ''
        } else if (type === 'savings') {
          const r = await aiCopilotApi.getSavingsPlan()
          text = (r.plans || []).map((p: { message?: string }) => p.message).join('\n\n')
        } else {
          const r = await aiCopilotApi.getDebtStrategy()
          text = (r.strategies || []).map((s: { message?: string }) => s.message).join('\n\n')
        }
        setMessages([{ role: 'assistant', content: text }])
      },
      {
        pendingKey: 'report',
        pendingMessage: 'loading.report',
        silentError: true,
        onError: () => {
          setMessages([{ role: 'assistant', content: t('common.error') }])
        },
      },
    )
  }

  const handleSend = () => {
    if (!inputText.trim() || sending) return

    const trimmed = inputText.trim()
    const userMessage: Message = {
      role: 'user',
      content: trimmed,
    }

    setMessages(prev => [...prev, userMessage])
    setInputText('')

    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true })
    }, 100)

    void feedback.run(
      async () => {
        logger.info('Sending message to AI Copilot:', trimmed)
        const response = await aiCopilotApi.chat(trimmed, conversationId)
        const responseData = response

        if (responseData.conversation_id) {
          if (!conversationId || conversationId !== responseData.conversation_id) {
            setConversationId(responseData.conversation_id)
          }
        }

        if (responseData.assistant_message) {
          const assistantMsg = responseData.assistant_message
          const message: Message = {
            id: assistantMsg.id,
            role: assistantMsg.role || 'assistant',
            content: assistantMsg.content || '',
            created_at: assistantMsg.created_at,
          }
          setMessages(prev => [...prev, message])
        } else {
          setMessages(prev => [...prev, {
            role: 'assistant',
            content: t('aiErrors.unexpectedFormat'),
            created_at: new Date().toISOString(),
          }])
        }

        setTimeout(() => {
          scrollViewRef.current?.scrollToEnd({ animated: true })
        }, 100)
      },
      {
        pendingKey: 'chat',
        pendingMessage: 'loading.aiThinking',
        silentError: true,
        onError: (error: unknown) => {
          logger.error('Error sending message:', error)
          let errorMessage = getApiErrorMessage(error, 'aiErrors.processFailed')
          if (isApiError(error)) {
            if (error.response?.status === 401) errorMessage = t('aiErrors.sessionExpired')
            else if (error.response?.status === 403) errorMessage = t('aiErrors.noPermission')
            else if (error.response?.status === 500) errorMessage = t('aiErrors.serverUnavailable')
          }
          setMessages(prev => [...prev, {
            role: 'assistant',
            content: errorMessage
          }])
        },
      },
    )
  }

  const formatMessageTime = (dateString?: string) => {
    if (!dateString) return ''
    const date = new Date(dateString)
    return formatTime(locale, date, { hour: '2-digit', minute: '2-digit' })
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <View style={styles.headerLeft}>
              <View style={styles.iconContainer}>
                <MaterialCommunityIcons name="robot" size={28} color={colors.brand.ai} />
              </View>
              <View style={styles.headerText}>
                <Text variant="titleLarge" style={styles.headerTitle}>
                  {t('ai.title')}
                </Text>
                <Text variant="bodySmall" style={styles.headerSubtitle}>
                  {t('ai.headerSubtitle')}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Messages */}
        <ScrollView
          ref={scrollViewRef}
          style={styles.messagesContainer}
          contentContainerStyle={styles.messagesContent}
          onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
        >
          {loading ? (
            <ZendaLoading visible fill message={t('loading.ai')} />
          ) : loadError && messages.length <= 1 ? (
            <View style={styles.loadingContainer}>
              <Text variant="bodyMedium" style={styles.loadingText}>{loadError}</Text>
              <Button mode="contained" onPress={loadConversation} buttonColor={colors.brand.ai}>
                {t('common.retry')}
              </Button>
            </View>
          ) : messages.length === 0 ? (
            <View style={styles.welcomeContainer}>
              {insights && (
                <ZendaCard variant="glass" style={{ width: '100%', marginBottom: spacing.md }}>
                  <Text style={styles.insightLabel}>{t('ai.monthlyReport')}</Text>
                  <Text style={styles.insightReport}>{insights.monthly_report}</Text>
                  {insights.health_score != null && (
                    <Text style={styles.insightScore}>
                      {t('ai.healthLabel')}: {insights.health_score}/100 ({insights.grade})
                    </Text>
                  )}
                </ZendaCard>
              )}
              <View style={styles.welcomeIcon}>
                <MaterialCommunityIcons name="robot" size={64} color={colors.brand.ai} />
              </View>
              <Text variant="headlineSmall" style={styles.welcomeTitle}>
                {t('ai.title')}
              </Text>
              <Text variant="bodyLarge" style={styles.welcomeText}>
                {t('ai.disclaimer')}
              </Text>
              <View style={styles.reportRow}>
                {(['monthly', 'savings', 'debt'] as const).map((key) => (
                  <TouchableOpacity
                    key={key}
                    style={[styles.reportChip, reportPending && styles.reportChipDisabled]}
                    onPress={() => loadReport(key)}
                    disabled={reportPending || chatPending}
                  >
                    <Text style={styles.reportChipText}>
                      {key === 'monthly' ? t('ai.monthlyReport') : key === 'savings' ? t('aiErrors.reportSavings') : t('aiErrors.reportDebt')}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              <Text style={styles.insightLabel}>{t('ai.smartSuggestions')}</Text>
              <View style={styles.suggestionsContainer}>
                <View style={styles.suggestionChips}>
                  {suggestionList.map((prompt) => (
                    <TouchableOpacity
                      key={prompt}
                      style={styles.suggestionChip}
                      onPress={() => setInputText(prompt)}
                    >
                      <MaterialCommunityIcons name="chat-outline" size={18} color={colors.brand.ai} />
                      <Text style={styles.suggestionText} numberOfLines={2}>{prompt}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </View>
          ) : (
            messages.map((message, index) => (
              <View
                key={index}
                style={[
                  styles.messageWrapper,
                  message.role === 'user' ? styles.userMessageWrapper : styles.assistantMessageWrapper,
                ]}
              >
                {message.role === 'assistant' && (
                  <View style={styles.assistantIcon}>
                    <MaterialCommunityIcons name="robot" size={20} color="#3C3BD4" />
                  </View>
                )}
                <Card
                  style={[
                    styles.messageCard,
                    message.role === 'user' ? styles.userMessageCard : styles.assistantMessageCard,
                  ]}
                >
                  <Card.Content style={styles.messageContent}>
                    <Text
                      variant="bodyMedium"
                      style={[
                        styles.messageText,
                        message.role === 'user' ? styles.userMessageText : styles.assistantMessageText,
                      ]}
                    >
                      {message.content}
                    </Text>
                    {message.created_at && (
                      <Text variant="bodySmall" style={styles.messageTime}>
                        {formatMessageTime(message.created_at)}
                      </Text>
                    )}
                  </Card.Content>
                </Card>
                {message.role === 'user' && (
                  <View style={styles.userIcon}>
                    <MaterialCommunityIcons name="account" size={20} color={colors.brand.primary} />
                  </View>
                )}
              </View>
            ))
          )}
          {sending && (
            <View style={styles.sendingIndicator}>
              <View style={styles.assistantIcon}>
                <MaterialCommunityIcons name="robot" size={22} color={colors.brand.ai} />
              </View>
              <Card style={styles.assistantMessageCard} elevation={1}>
                <Card.Content style={styles.messageContent}>
                  <ZendaLoader
                    inline
                    size="sm"
                    message={reportPending ? t('loading.report') : t('loading.aiThinking')}
                  />
                  <View style={styles.typingDots}>
                    <Animated.View style={[styles.dot, { opacity: dot1Anim }]} />
                    <Animated.View style={[styles.dot, { opacity: dot2Anim }]} />
                    <Animated.View style={[styles.dot, { opacity: dot3Anim }]} />
                  </View>
                </Card.Content>
              </Card>
            </View>
          )}
        </ScrollView>

        {/* Input Area */}
        <View style={styles.inputContainer}>
          <View style={styles.inputWrapper}>
            <TextInput
              ref={inputRef}
              mode="outlined"
              placeholder={t('aiErrors.placeholder')}
              value={inputText}
              onChangeText={setInputText}
              multiline
              maxLength={500}
              style={styles.input}
              contentStyle={styles.inputContent}
              disabled={sending || loading}
              onSubmitEditing={handleSend}
              returnKeyType="send"
              left={<TextInput.Icon icon="message-text" />}
            />
            <Button
              mode="contained"
              onPress={handleSend}
              disabled={!inputText.trim() || sending || loading}
              loading={chatPending}
              style={styles.sendButton}
              contentStyle={styles.sendButtonContent}
              buttonColor={colors.brand.ai}
              icon={chatPending ? undefined : 'send'}
            >
              {chatPending ? t('loading.aiThinking') : t('common.send')}
            </Button>
          </View>
          <Text variant="bodySmall" style={styles.inputHint}>
            {t('ai.inputHint')}
          </Text>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  container: {
    flex: 1,
  },
  header: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    elevation: 2,
    shadowColor: '#3C3BD4',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: '#f5f3ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
    borderWidth: 2,
    borderColor: '#e9d5ff',
  },
  headerText: {
    flex: 1,
  },
  headerTitle: {
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 4,
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    color: '#6b7280',
    fontSize: 13,
  },
  messagesContainer: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  messagesContent: {
    padding: 16,
    paddingBottom: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 48,
  },
  loadingText: {
    marginTop: 16,
    color: '#6b7280',
  },
  welcomeContainer: {
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 24,
  },
  welcomeIcon: {
    width: 120,
    height: 120,
    borderRadius: 30,
    backgroundColor: '#f5f3ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    borderWidth: 3,
    borderColor: '#e9d5ff',
  },
  welcomeTitle: {
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 12,
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  welcomeText: {
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 22,
  },
  suggestionsContainer: {
    width: '100%',
    alignItems: 'center',
  },
  suggestionsTitle: {
    color: '#374151',
    marginBottom: 16,
    fontWeight: '600',
  },
  suggestionChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 12,
  },
  suggestionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    gap: 8,
  },
  suggestionText: {
    color: '#374151',
    fontWeight: '500',
  },
  messageWrapper: {
    flexDirection: 'row',
    marginBottom: 20,
    alignItems: 'flex-end',
  },
  userMessageWrapper: {
    justifyContent: 'flex-end',
  },
  assistantMessageWrapper: {
    justifyContent: 'flex-start',
  },
  messageCard: {
    maxWidth: '80%',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  userMessageCard: {
    backgroundColor: '#3534C9',
    borderRadius: 20,
    borderBottomRightRadius: 4,
  },
  assistantMessageCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  messageContent: {
    padding: 14,
  },
  messageText: {
    color: '#1f2937',
    lineHeight: 20,
  },
  userMessageText: {
    color: '#ffffff',
  },
  assistantMessageText: {
    color: '#1f2937',
  },
  messageTime: {
    marginTop: 6,
    opacity: 0.6,
    fontSize: 11,
  },
  assistantIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f5f3ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    marginBottom: 4,
    borderWidth: 2,
    borderColor: '#e9d5ff',
  },
  userIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#eef2ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 10,
    marginBottom: 4,
    borderWidth: 2,
    borderColor: '#c7d2fe',
  },
  sendingIndicator: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: 20,
    justifyContent: 'flex-start',
  },
  typingDots: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
    paddingVertical: 4,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#3C3BD4',
  },
  inputContainer: {
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    paddingHorizontal: 16,
    paddingVertical: 16,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 12,
  },
  input: {
    flex: 1,
    backgroundColor: '#f9fafb',
    maxHeight: 100,
  },
  inputContent: {
    minHeight: 48,
    paddingVertical: 12,
  },
  sendButton: {
    borderRadius: 12,
    elevation: 2,
  },
  insightLabel: {
    ...typography.label,
    color: colors.brand.ai,
    marginBottom: spacing.xs,
    textTransform: 'uppercase',
  },
  insightReport: {
    ...typography.body,
    color: colors.text.primary,
    marginBottom: spacing.sm,
  },
  insightScore: {
    ...typography.caption,
    color: colors.brand.secondary,
    fontWeight: '600',
  },
  reportRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: spacing.md, width: '100%' },
  reportChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F5F3FF',
    borderWidth: 1,
    borderColor: '#E9D5FF',
  },
  reportChipText: { fontSize: 12, fontWeight: '600', color: colors.brand.ai },
  reportChipDisabled: { opacity: 0.5 },
  sendButtonContent: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    height: 48,
  },
  inputHint: {
    marginTop: 12,
    color: '#9ca3af',
    textAlign: 'center',
    fontSize: 12,
  },
})
