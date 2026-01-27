import React, { useState, useEffect, useRef } from 'react'
import { View, StyleSheet, ScrollView, KeyboardAvoidingView, Platform, TextInput as RNTextInput } from 'react-native'
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

  useEffect(() => {
    if (conversationId) {
      loadConversation()
    } else {
      // Welcome message
      setMessages([{
        role: 'assistant',
        content: 'Olá! Sou o AI Financial Copilot. Estou aqui para ajudá-lo com suas finanças pessoais e de negócios.\n\nPosso ajudá-lo com:\n• Planejamento de orçamento\n• Estratégias de poupança\n• Gestão de dívidas\n• Definição de metas financeiras\n• Educação financeira\n\nComo posso ajudá-lo hoje?'
      }])
    }
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
      const response = await aiCopilotApi.chat(inputText.trim(), conversationId)
      
      // Handle response - could be direct data or wrapped
      const responseData = response.data || response
      
      // Update conversation ID if this is a new conversation
      if (responseData.conversation_id && !conversationId) {
        setConversationId(responseData.conversation_id)
      }

      // Add assistant response
      if (responseData.assistant_message) {
        // Handle both serialized and direct message formats
        const assistantMsg = responseData.assistant_message.data || responseData.assistant_message
        const message: Message = {
          id: assistantMsg.id,
          role: assistantMsg.role || 'assistant',
          content: assistantMsg.content || assistantMsg.message || '',
          created_at: assistantMsg.created_at,
        }
        setMessages(prev => [...prev, message])
      }

      // Scroll to bottom after response
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true })
      }, 100)
    } catch (error: any) {
      console.error('Error sending message:', error)
      
      // Provide more helpful error message
      let errorMessage = 'Desculpe, ocorreu um erro ao processar sua mensagem. Por favor, tente novamente.'
      
      if (error.response?.status === 401) {
        errorMessage = 'Sessão expirada. Por favor, faça login novamente.'
      } else if (error.response?.status === 403) {
        errorMessage = 'Você não tem permissão para usar esta funcionalidade.'
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
                <MaterialCommunityIcons name="robot" size={24} color="#8b5cf6" />
              </View>
              <View>
                <Text variant="titleMedium" style={styles.headerTitle}>
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
              <ActivityIndicator size="small" color="#8b5cf6" />
              <Text variant="bodySmall" style={styles.sendingText}>
                AI está pensando...
              </Text>
            </View>
          )}
        </ScrollView>

        {/* Input Area */}
        <View style={styles.inputContainer}>
          <View style={styles.inputWrapper}>
            <TextInput
              ref={inputRef}
              mode="outlined"
              placeholder="Digite sua pergunta..."
              value={inputText}
              onChangeText={setInputText}
              multiline
              maxLength={500}
              style={styles.input}
              contentStyle={styles.inputContent}
              disabled={sending}
              onSubmitEditing={handleSend}
              returnKeyType="send"
            />
            <Button
              mode="contained"
              onPress={handleSend}
              disabled={!inputText.trim() || sending}
              style={styles.sendButton}
              contentStyle={styles.sendButtonContent}
              icon="send"
            >
              Enviar
            </Button>
          </View>
          <Text variant="bodySmall" style={styles.inputHint}>
            O AI pode ajudá-lo com orçamento, poupança, dívidas e muito mais
          </Text>
        </View>
      </KeyboardAvoidingView>
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
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    elevation: 2,
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
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f3e8ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  headerTitle: {
    fontWeight: 'bold',
    color: '#1f2937',
  },
  headerSubtitle: {
    color: '#666',
    marginTop: 2,
  },
  messagesContainer: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  messagesContent: {
    padding: 16,
    paddingBottom: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 32,
  },
  messageWrapper: {
    flexDirection: 'row',
    marginBottom: 16,
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
    elevation: 1,
  },
  userMessageCard: {
    backgroundColor: '#6366f1',
    borderTopRightRadius: 4,
  },
  assistantMessageCard: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 4,
  },
  messageContent: {
    padding: 12,
  },
  messageText: {
    color: '#1f2937',
  },
  userMessageText: {
    color: '#fff',
  },
  assistantMessageText: {
    color: '#1f2937',
  },
  messageTime: {
    marginTop: 4,
    opacity: 0.7,
    fontSize: 10,
  },
  assistantIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f3e8ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
    marginBottom: 4,
  },
  userIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#eef2ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
    marginBottom: 4,
  },
  sendingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 8,
  },
  sendingText: {
    color: '#666',
  },
  inputContainer: {
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
  },
  input: {
    flex: 1,
    backgroundColor: '#f9fafb',
    maxHeight: 100,
  },
  inputContent: {
    minHeight: 44,
  },
  sendButton: {
    borderRadius: 8,
  },
  sendButtonContent: {
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  inputHint: {
    marginTop: 8,
    color: '#999',
    textAlign: 'center',
  },
})
