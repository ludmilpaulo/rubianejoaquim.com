import React, { useState } from 'react'
import { View, StyleSheet, ScrollView, Linking } from 'react-native'
import { Text, Card, List, TextInput, Button, Divider } from 'react-native-paper'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { SafeAreaView } from 'react-native-safe-area-context'

export default function HelpSupportScreen() {
  const [expandedFAQ, setExpandedFAQ] = useState<string | null>(null)
  const [contactForm, setContactForm] = useState({ subject: '', message: '' })

  const faqs = [
    {
      id: '1',
      question: 'Como adicionar uma despesa?',
      answer: 'Vá à aba "Despesas" e clique no botão "+" no canto inferior direito. Preencha os dados e salve.',
    },
    {
      id: '2',
      question: 'Como funciona a Regra dos 100%?',
      answer: 'A regra divide o seu rendimento em 50% para despesas fixas, 30% para desejos e 20% para poupança. Use a calculadora na aba "Regras de Ouro" para ver os valores.',
    },
    {
      id: '3',
      question: 'O que é a Regra 3×?',
      answer: 'Antes de gastar em desejos, deve ter 3 vezes o valor disponível. Por exemplo, para gastar 10.000 AOA, precisa de ter 30.000 AOA disponível.',
    },
    {
      id: '4',
      question: 'Como criar um objetivo financeiro?',
      answer: 'Vá à aba "Objetivos" e clique no botão "+". Defina o título, valor alvo e data. Pode adicionar dinheiro ao objetivo quando quiser.',
    },
    {
      id: '5',
      question: 'Como aceder aos cursos?',
      answer: 'Vá à aba "Educação" para ver os cursos disponíveis. Se tiver acesso pago, pode assistir às aulas diretamente.',
    },
    {
      id: '6',
      question: 'Como funciona o AI Financial Copilot?',
      answer: 'O AI Copilot analisa os seus dados financeiros e fornece conselhos personalizados para melhorar a sua gestão financeira.',
    },
  ]

  const handleOpenWhatsApp = () => {
    Linking.openURL('https://wa.me/244944905246?text=Olá, preciso de ajuda com o app Zenda')
  }

  const handleOpenEmail = () => {
    Linking.openURL(`mailto:contacto@rubianejoaquim.com?subject=${encodeURIComponent(contactForm.subject)}&body=${encodeURIComponent(contactForm.message)}`)
  }

  const handleSendMessage = () => {
    if (!contactForm.subject || !contactForm.message) {
      return
    }
    handleOpenEmail()
    setContactForm({ subject: '', message: '' })
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView style={styles.container}>
        {/* Quick Help */}
        <Card style={styles.card}>
          <Card.Content>
            <View style={styles.quickHelpHeader}>
              <MaterialCommunityIcons name="help-circle" size={32} color="#6366f1" />
              <Text variant="titleLarge" style={styles.sectionTitle}>Ajuda Rápida</Text>
            </View>
            <Text variant="bodyMedium" style={styles.description}>
              Encontre respostas para as perguntas mais frequentes ou entre em contacto connosco.
            </Text>
          </Card.Content>
        </Card>

        {/* FAQs */}
        <Card style={styles.card}>
          <Card.Content>
            <Text variant="titleLarge" style={styles.sectionTitle}>Perguntas Frequentes</Text>
            {faqs.map((faq, index) => (
              <View key={faq.id}>
                <List.Accordion
                  title={faq.question}
                  expanded={expandedFAQ === faq.id}
                  onPress={() => setExpandedFAQ(expandedFAQ === faq.id ? null : faq.id)}
                  left={(props) => <List.Icon {...props} icon="help-circle" color="#6366f1" />}
                  style={styles.faqItem}
                >
                  <List.Item
                    title={faq.answer}
                    titleNumberOfLines={10}
                    titleStyle={styles.faqAnswer}
                  />
                </List.Accordion>
                {index < faqs.length - 1 && <Divider />}
              </View>
            ))}
          </Card.Content>
        </Card>

        {/* Contact Form */}
        <Card style={styles.card}>
          <Card.Content>
            <Text variant="titleLarge" style={styles.sectionTitle}>Enviar Mensagem</Text>
            <Text variant="bodyMedium" style={styles.description}>
              Tem uma questão específica? Envie-nos uma mensagem e responderemos o mais breve possível.
            </Text>
            <TextInput
              mode="outlined"
              label="Assunto"
              value={contactForm.subject}
              onChangeText={(text) => setContactForm({ ...contactForm, subject: text })}
              style={styles.input}
            />
            <TextInput
              mode="outlined"
              label="Mensagem"
              value={contactForm.message}
              onChangeText={(text) => setContactForm({ ...contactForm, message: text })}
              multiline
              numberOfLines={4}
              style={styles.input}
            />
            <Button
              mode="contained"
              onPress={handleSendMessage}
              disabled={!contactForm.subject || !contactForm.message}
              style={styles.sendButton}
              buttonColor="#6366f1"
            >
              Enviar por Email
            </Button>
          </Card.Content>
        </Card>

        {/* Quick Contact */}
        <Card style={styles.card}>
          <Card.Content>
            <Text variant="titleLarge" style={styles.sectionTitle}>Contacto Direto</Text>
            <Button
              mode="contained"
              icon="whatsapp"
              onPress={handleOpenWhatsApp}
              style={styles.contactButton}
              contentStyle={styles.buttonContent}
              buttonColor="#25D366"
            >
              Falar no WhatsApp
            </Button>
            <Button
              mode="outlined"
              icon="email"
              onPress={handleOpenEmail}
              style={styles.contactButton}
              contentStyle={styles.buttonContent}
            >
              Enviar Email
            </Button>
          </Card.Content>
        </Card>
      </ScrollView>
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
  card: {
    margin: 16,
    marginBottom: 0,
    borderRadius: 16,
    elevation: 2,
    backgroundColor: '#ffffff',
  },
  quickHelpHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  sectionTitle: {
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 12,
    letterSpacing: -0.3,
  },
  description: {
    color: '#374151',
    lineHeight: 22,
    marginBottom: 16,
  },
  faqItem: {
    paddingVertical: 8,
  },
  faqAnswer: {
    color: '#6b7280',
    fontSize: 14,
    lineHeight: 20,
  },
  input: {
    marginBottom: 16,
    backgroundColor: '#ffffff',
  },
  sendButton: {
    marginTop: 8,
    borderRadius: 12,
  },
  contactButton: {
    marginBottom: 12,
    borderRadius: 12,
  },
  buttonContent: {
    paddingVertical: 8,
  },
})
