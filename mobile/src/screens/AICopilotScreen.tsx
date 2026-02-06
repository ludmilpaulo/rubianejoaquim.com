import React, { useState, useEffect, useRef } from 'react'
import { View, StyleSheet, ScrollView, KeyboardAvoidingView, Platform, TextInput as RNTextInput, Animated, TouchableOpacity } from 'react-native'
import { Text, TextInput, Button, Card, ActivityIndicator } from 'react-native-paper'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useNavigation, useRoute } from '@react-navigation/native'
import { aiCopilotApi } from '../services/api'

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
  const navigation = useNavigation<any>()
  const route = useRoute()
  const { conversationId: initialConversationId } = (route.params as RouteParams) || {}
  
  const [messages, setMessages] = useState<Message[]>([])
  const [inputText, setInputText] = useState('')
  const [loading, setLoading] = useState(false)
  const [conversationId, setConversationId] = useState<number | null>(initialConversationId || null)
  const [sending, setSending] = useState(false)
  const scrollViewRef = useRef<ScrollView>(null)
  const inputRef = useRef<RNTextInput>(null)
  const dot1Anim = useRef(new Animated.Value(0.4)).current
  const dot2Anim = useRef(new Animated.Value(0.4)).current
  const dot3Anim = useRef(new Animated.Value(0.4)).current

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
      const response = await aiCopilotApi.getConversation(conversationId)
      // Handle response - could be direct data or wrapped
      const conversation = response.data || response
      if (conversation.messages) {
        const messagesData = Array.isArray(conversation.messages) 
          ? conversation.messages 
          : conversation.messages.results || []
        // Ensure messages have correct format
        const formattedMessages: Message[] = messagesData.map((msg: any) => ({
          id: msg.id,
          role: msg.role || 'assistant',
          content: msg.content || msg.message || '',
          created_at: msg.created_at,
        }))
        setMessages(formattedMessages)
      }
    } catch (error: any) {
      console.error('Error loading conversation:', error)
      // Show error message
      let errorMsg = 'Erro ao carregar conversa. Por favor, tente novamente.'
      if (error.response?.status === 404) {
        errorMsg = 'Conversa não encontrada.'
      } else if (error.response?.status === 401) {
        errorMsg = 'Sessão expirada. Por favor, faça login novamente.'
      }
      setMessages([{
        role: 'assistant',
        content: errorMsg
      }])
    } finally {
      setLoading(false)
    }
  }

  const handleSend = async () => {
    if (!inputText.trim() || sending) return

    const userMessage: Message = {
      role: 'user',
      content: inputText.trim(),
    }

    // Add user message immediately
    setMessages(prev => [...prev, userMessage])
    setInputText('')
    setSending(true)

    // Scroll to bottom
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true })
    }, 100)

    try {
      console.log('📤 Sending message to AI Copilot:', inputText.trim())
      const response = await aiCopilotApi.chat(inputText.trim(), conversationId)
      
      console.log('✅ AI Copilot response:', response)
      
      // Response from api.ts already returns response.data, so response is the data object
      const responseData = response
      
      // Update conversation ID if this is a new conversation or if it changed
      if (responseData.conversation_id) {
        if (!conversationId || conversationId !== responseData.conversation_id) {
          setConversationId(responseData.conversation_id)
          console.log('💬 Conversation ID:', responseData.conversation_id)
        }
      }

      // Add assistant response
      // Backend returns: { conversation_id, conversation_title, user_message, assistant_message }
      // assistant_message is a MessageSerializer object: { id, role, content, created_at }
      if (responseData.assistant_message) {
        const assistantMsg = responseData.assistant_message
        const message: Message = {
          id: assistantMsg.id,
          role: assistantMsg.role || 'assistant',
          content: assistantMsg.content || '',
          created_at: assistantMsg.created_at,
        }
        console.log('🤖 Assistant message:', message)
        setMessages(prev => [...prev, message])
      } else {
        console.warn('⚠️ Unexpected response format:', responseData)
        // Fallback: show error message
        const message: Message = {
          role: 'assistant',
          content: 'Desculpe, recebi uma resposta em formato inesperado. Por favor, tente novamente.',
          created_at: new Date().toISOString(),
        }
        setMessages(prev => [...prev, message])
      }

      // Scroll to bottom after response
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true })
      }, 100)
    } catch (error: any) {
      console.error('❌ Error sending message:', error)
      console.error('Error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
      })
      
      // Provide more helpful error message
      let errorMessage = 'Desculpe, ocorreu um erro ao processar sua mensagem. Por favor, tente novamente.'
      
      if (error.response?.status === 401) {
        errorMessage = 'Sessão expirada. Por favor, faça login novamente.'
      } else if (error.response?.status === 403) {
        errorMessage = 'Você não tem permissão para usar esta funcionalidade.'
      } else if (error.response?.status === 500) {
        errorMessage = 'Erro no servidor. O AI Copilot pode estar temporariamente indisponível. Tente novamente em alguns instantes.'
      } else if (error.response?.data?.error) {
        errorMessage = error.response.data.error
      } else if (error.message) {
        errorMessage = `Erro: ${error.message}`
      }
      
      // Add error message
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: errorMessage
      }])
    } finally {
      setSending(false)
    }
  }

  const formatTime = (dateString?: string) => {
    if (!dateString) return ''
    const date = new Date(dateString)
    return date.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })
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
                <MaterialCommunityIcons name="robot" size={28} color="#8b5cf6" />
              </View>
              <View style={styles.headerText}>
                <Text variant="titleLarge" style={styles.headerTitle}>
                  AI Financial Copilot
                </Text>
                <Text variant="bodySmall" style={styles.headerSubtitle}>
                  Seu assistente financeiro pessoal
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
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#8b5cf6" />
            </View>
          ) : messages.length === 0 ? (
            <View style={styles.welcomeContainer}>
              <View style={styles.welcomeIcon}>
                <MaterialCommunityIcons name="robot" size={64} color="#8b5cf6" />
              </View>
              <Text variant="headlineSmall" style={styles.welcomeTitle}>
                Olá! Sou o AI Financial Copilot
              </Text>
              <Text variant="bodyLarge" style={styles.welcomeText}>
                Estou aqui para ajudá-lo com suas finanças. Posso ajudá-lo com:
              </Text>
              <View style={styles.suggestionsContainer}>
                <Text variant="bodyMedium" style={styles.suggestionsTitle}>
                  Tente perguntar sobre:
                </Text>
                <View style={styles.suggestionChips}>
                  <TouchableOpacity
                    style={styles.suggestionChip}
                    onPress={() => {
                      setInputText('Como criar um orçamento?')
                    }}
                  >
                    <MaterialCommunityIcons name="wallet-outline" size={18} color="#8b5cf6" />
                    <Text style={styles.suggestionText}>Orçamento</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.suggestionChip}
                    onPress={() => {
                      setInputText('Como economizar dinheiro?')
                    }}
                  >
                    <MaterialCommunityIcons name="piggy-bank-outline" size={18} color="#8b5cf6" />
                    <Text style={styles.suggestionText}>Poupança</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.suggestionChip}
                    onPress={() => {
                      setInputText('Como pagar dívidas?')
                    }}
                  >
                    <MaterialCommunityIcons name="credit-card-outline" size={18} color="#8b5cf6" />
                    <Text style={styles.suggestionText}>Dívidas</Text>
                  </TouchableOpacity>
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
                    <MaterialCommunityIcons name="robot" size={20} color="#8b5cf6" />
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
                        {formatTime(message.created_at)}
                      </Text>
                    )}
                  </Card.Content>
                </Card>
                {message.role === 'user' && (
                  <View style={styles.userIcon}>
                    <MaterialCommunityIcons name="account" size={20} color="#6366f1" />
                  </View>
                )}
              </View>
            ))
          )}
          {sending && (
            <View style={styles.sendingIndicator}>
              <View style={styles.assistantIcon}>
                <MaterialCommunityIcons name="robot" size={22} color="#8b5cf6" />
              </View>
              <Card style={styles.assistantMessageCard} elevation={1}>
                <Card.Content style={styles.messageContent}>
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
              placeholder="Digite sua pergunta sobre finanças..."
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
              style={styles.sendButton}
              contentStyle={styles.sendButtonContent}
              buttonColor="#8b5cf6"
              icon="send"
            >
              Enviar
            </Button>
          </View>
          <Text variant="bodySmall" style={styles.inputHint}>
            💡 O AI pode ajudá-lo com orçamento, poupança, dívidas e muito mais
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
    shadowColor: '#8b5cf6',
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
    backgroundColor: '#6366f1',
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
    backgroundColor: '#8b5cf6',
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
