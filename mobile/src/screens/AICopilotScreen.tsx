import React, { useState, useEffect, useRef } from 'react'
import { View, StyleSheet, ScrollView, KeyboardAvoidingView, Platform, TextInput as RNTextInput, Animated, TouchableOpacity, Share, Modal } from 'react-native'
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
import {
  ChatMessageDto,
  getApiErrorMessage,
  isApiError,
  unwrapList,
  type CopilotFacts,
  type CopilotProposedAction,
} from '../types/api'

interface Message {
  id?: number
  role: 'user' | 'assistant' | 'system'
  content: string
  created_at?: string
  facts?: CopilotFacts | null
  proposed_action?: CopilotProposedAction | null
  failed?: boolean
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
  const [lastPrompt, setLastPrompt] = useState<string | null>(null)
  const [stillAnalyzing, setStillAnalyzing] = useState(false)
  const [historyOpen, setHistoryOpen] = useState(false)
  const [history, setHistory] = useState<{ id: number; title: string; last_message_preview?: string }[]>([])

  useEffect(() => {
    aiCopilotApi.getInsights(locale).then(setInsights).catch(() => setInsights(null))
  }, [locale])

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
          facts: msg.facts,
          proposed_action: msg.proposed_action,
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

  const sendPrompt = (trimmed: string) => {
    if (!trimmed || sending) return
    setLastPrompt(trimmed)
    const userMessage: Message = {
      role: 'user',
      content: trimmed,
      created_at: new Date().toISOString(),
    }
    setMessages((prev) => [...prev, userMessage])
    setInputText('')
    setStillAnalyzing(false)
    const slow = setTimeout(() => setStillAnalyzing(true), 8000)

    void feedback.run(
      async () => {
        const response = await aiCopilotApi.chat(trimmed, conversationId, locale)
        if (response.conversation_id) {
          if (!conversationId || conversationId !== response.conversation_id) {
            setConversationId(response.conversation_id)
          }
        }
        if (response.assistant_message) {
          const assistantMsg = response.assistant_message
          setMessages((prev) => [
            ...prev,
            {
              id: assistantMsg.id,
              role: assistantMsg.role || 'assistant',
              content: assistantMsg.content || '',
              created_at: assistantMsg.created_at,
              facts: assistantMsg.facts || response.facts,
              proposed_action: assistantMsg.proposed_action || response.proposed_action,
            },
          ])
        } else {
          setMessages((prev) => [
            ...prev,
            { role: 'assistant', content: t('aiErrors.unexpectedFormat'), failed: true },
          ])
        }
      },
      {
        pendingKey: 'chat',
        pendingMessage: stillAnalyzing ? 'ai.stillAnalyzing' : 'ai.analyzing',
        silentError: true,
        onError: (error: unknown) => {
          let errorMessage = t('ai.analysisFailed')
          if (!isApiError(error) || !error.response) {
            errorMessage = t('ai.offline')
          } else if (error.response.status === 401) errorMessage = t('aiErrors.sessionExpired')
          else if (error.response.status === 403) errorMessage = t('aiErrors.noPermission')
          else errorMessage = getApiErrorMessage(error, t('ai.analysisFailed'))
          setMessages((prev) => [...prev, { role: 'assistant', content: errorMessage, failed: true }])
        },
      },
    ).finally(() => {
      clearTimeout(slow)
      setStillAnalyzing(false)
    })
  }

  const handleSend = () => {
    if (!inputText.trim() || sending) return
    sendPrompt(inputText.trim())
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
            <View style={styles.headerActions}>
              <TouchableOpacity
                onPress={() => {
                  aiCopilotApi.getConversations().then((data) => {
                    setHistory(unwrapList(data) as { id: number; title: string; last_message_preview?: string }[])
                    setHistoryOpen(true)
                  }).catch(() => setHistoryOpen(true))
                }}
                accessibilityLabel={t('ai.history')}
              >
                <MaterialCommunityIcons name="history" size={22} color={colors.brand.ai} />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => {
                  setConversationId(null)
                  setMessages([])
                  setLastPrompt(null)
                }}
                accessibilityLabel={t('ai.newChat')}
              >
                <MaterialCommunityIcons name="plus" size={24} color={colors.brand.ai} />
              </TouchableOpacity>
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
                      onPress={() => sendPrompt(prompt)}
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
                    {message.role === 'assistant' && message.facts?.fx && !message.facts.fx.error ? (
                      <View style={styles.fxCard}>
                        <Text style={styles.fxLine}>
                          {message.facts.fx.original_amount} {message.facts.fx.original_currency}
                          {' → '}
                          {message.facts.fx.converted_amount} {message.facts.fx.target_currency}
                        </Text>
                        <Text style={styles.fxMeta}>
                          {t('ai.fxRate')}: 1 {message.facts.fx.original_currency} = {message.facts.fx.exchange_rate} {message.facts.fx.target_currency}
                        </Text>
                        <Text style={styles.fxMeta}>{t('ai.fxSource')}: {message.facts.fx.source}</Text>
                        <Text style={styles.fxMeta}>{t('ai.fxTime')}: {message.facts.fx.provider_updated_at || '—'}</Text>
                        <Text style={styles.fxMeta}>
                          {message.facts.fx.stale ? t('ai.fxLatest') : t('ai.fxLive')}
                        </Text>
                      </View>
                    ) : null}
                    {message.role === 'assistant' && message.facts && !message.facts.fx ? (
                      <View style={styles.fxCard}>
                        {message.facts.income != null ? (
                          <Text style={styles.fxMeta}>
                            {message.facts.income} {message.facts.currency || ''}
                            {message.facts.expenses != null
                              ? ` → ${message.facts.expenses} ${message.facts.currency || ''}`
                              : ''}
                          </Text>
                        ) : null}
                        {message.facts.health?.score != null ? (
                          <Text style={styles.fxMeta}>
                            {t('ai.healthLabel')}: {message.facts.health.score}/100
                          </Text>
                        ) : null}
                      </View>
                    ) : null}
                    {message.role === 'assistant' && message.proposed_action?.status === 'pending' && conversationId ? (
                      <View style={styles.actionBox}>
                        <Text style={styles.actionSummary}>{message.proposed_action.summary || t('ai.actionPending')}</Text>
                        <View style={styles.actionRow}>
                          <Button
                            compact
                            mode="contained"
                            buttonColor={colors.brand.ai}
                            onPress={() => {
                              const actionId = message.proposed_action!.id
                              aiCopilotApi
                                .confirmAction(conversationId, actionId, true, locale)
                                .then((res) => {
                                  setMessages((prev) => {
                                    const updated = prev.map((item) =>
                                      item.proposed_action?.id === actionId
                                        ? {
                                            ...item,
                                            proposed_action: {
                                              ...item.proposed_action!,
                                              status: 'confirmed' as const,
                                            },
                                          }
                                        : item,
                                    )
                                    if (res.assistant_message) {
                                      return [...updated, res.assistant_message as Message]
                                    }
                                    return updated
                                  })
                                })
                                .catch((err) => logger.error(getApiErrorMessage(err)))
                            }}
                          >
                            {t('ai.confirmAction')}
                          </Button>
                          <Button
                            compact
                            onPress={() => {
                              const actionId = message.proposed_action!.id
                              aiCopilotApi.confirmAction(conversationId, actionId, false, locale).catch(() => {})
                              setMessages((prev) =>
                                prev.map((item) =>
                                  item.proposed_action?.id === actionId
                                    ? {
                                        ...item,
                                        proposed_action: {
                                          ...item.proposed_action!,
                                          status: 'cancelled' as const,
                                        },
                                      }
                                    : item,
                                ),
                              )
                            }}
                          >
                            {t('ai.cancelAction')}
                          </Button>
                        </View>
                      </View>
                    ) : null}
                    {message.role === 'assistant' ? (
                      <View style={styles.msgActions}>
                        <TouchableOpacity
                          onPress={() => {
                            if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
                              void navigator.clipboard.writeText(message.content)
                              return
                            }
                            void Share.share({ message: message.content })
                          }}
                        >
                          <Text style={styles.msgAction}>{t('ai.copy')}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => Share.share({ message: message.content })}>
                          <Text style={styles.msgAction}>{t('ai.share')}</Text>
                        </TouchableOpacity>
                        {message.failed && lastPrompt ? (
                          <TouchableOpacity onPress={() => sendPrompt(lastPrompt)}>
                            <Text style={styles.msgAction}>{t('ai.retryLast')}</Text>
                          </TouchableOpacity>
                        ) : null}
                      </View>
                    ) : null}
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
                    message={stillAnalyzing ? t('ai.stillAnalyzing') : t('ai.analyzing')}
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
              {chatPending ? t('ai.analyzing') : t('common.send')}
            </Button>
          </View>
          <Text variant="bodySmall" style={styles.inputHint}>
            {t('ai.inputHint')}
          </Text>
        </View>
        <Modal visible={historyOpen} animationType="slide" onRequestClose={() => setHistoryOpen(false)}>
          <SafeAreaView style={styles.safeArea}>
            <View style={styles.header}>
              <Text style={styles.headerTitle}>{t('ai.history')}</Text>
              <Button onPress={() => setHistoryOpen(false)}>{t('common.cancel')}</Button>
            </View>
            <ScrollView contentContainerStyle={styles.messagesContent}>
              {history.length === 0 ? (
                <Text style={styles.welcomeText}>{t('ai.emptyHistory')}</Text>
              ) : (
                history.map((item) => (
                  <TouchableOpacity
                    key={item.id}
                    style={styles.historyRow}
                    onPress={() => {
                      setConversationId(item.id)
                      setHistoryOpen(false)
                    }}
                  >
                    <Text style={styles.insightReport}>{item.title}</Text>
                    {item.last_message_preview ? (
                      <Text style={styles.fxMeta}>{item.last_message_preview}</Text>
                    ) : null}
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>
          </SafeAreaView>
        </Modal>
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
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  headerActions: { flexDirection: 'row', gap: 16, alignItems: 'center' },
  fxCard: {
    marginTop: 10,
    padding: 10,
    borderRadius: 12,
    backgroundColor: '#F5F3FF',
  },
  fxLine: { fontWeight: '700', color: '#1f2937', marginBottom: 4 },
  fxMeta: { fontSize: 11, color: '#6b7280', marginTop: 2 },
  actionBox: { marginTop: 10 },
  actionSummary: { fontSize: 13, color: '#374151', marginBottom: 8 },
  actionRow: { flexDirection: 'row', gap: 8 },
  msgActions: { flexDirection: 'row', gap: 12, marginTop: 8 },
  msgAction: { fontSize: 12, fontWeight: '600', color: colors.brand.ai },
  historyRow: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
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
