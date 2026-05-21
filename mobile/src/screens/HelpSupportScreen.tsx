import React, { useState } from 'react'
import { View, StyleSheet, ScrollView, Linking } from 'react-native'
import { Text, Card, List, TextInput, Button, Divider } from 'react-native-paper'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useI18n } from '../contexts/I18nContext'

export default function HelpSupportScreen() {
  const { t, messages } = useI18n()
  const [expandedFAQ, setExpandedFAQ] = useState<string | null>(null)
  const [contactForm, setContactForm] = useState({ subject: '', message: '' })

  const faqs = messages.help.faqs

  const handleOpenWhatsApp = () => {
    const text = encodeURIComponent(t('help.whatsappPrefill'))
    Linking.openURL(`https://wa.me/244944905246?text=${text}`)
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
        <Card style={styles.card}>
          <Card.Content>
            <View style={styles.quickHelpHeader}>
              <MaterialCommunityIcons name="help-circle" size={32} color="#6366f1" />
              <Text variant="titleLarge" style={styles.sectionTitle}>{t('help.quickTitle')}</Text>
            </View>
            <Text variant="bodyMedium" style={styles.description}>
              {t('help.quickDescription')}
            </Text>
          </Card.Content>
        </Card>

        <Card style={styles.card}>
          <Card.Content>
            <Text variant="titleLarge" style={styles.sectionTitle}>{t('help.faqTitle')}</Text>
            {faqs.map((faq, index) => (
              <View key={String(index)}>
                <List.Accordion
                  title={faq.question}
                  expanded={expandedFAQ === String(index)}
                  onPress={() => setExpandedFAQ(expandedFAQ === String(index) ? null : String(index))}
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

        <Card style={styles.card}>
          <Card.Content>
            <Text variant="titleLarge" style={styles.sectionTitle}>{t('help.contactTitle')}</Text>
            <Text variant="bodyMedium" style={styles.description}>
              {t('help.contactDescription')}
            </Text>
            <TextInput
              mode="outlined"
              label={t('help.subject')}
              value={contactForm.subject}
              onChangeText={(text) => setContactForm({ ...contactForm, subject: text })}
              style={styles.input}
            />
            <TextInput
              mode="outlined"
              label={t('help.message')}
              value={contactForm.message}
              onChangeText={(text) => setContactForm({ ...contactForm, message: text })}
              multiline
              numberOfLines={4}
              style={styles.input}
            />
            <Button
              mode="contained"
              icon="email"
              onPress={handleSendMessage}
              style={styles.sendButton}
              buttonColor="#6366f1"
            >
              {t('help.sendEmail')}
            </Button>
            <Button
              mode="outlined"
              icon="whatsapp"
              onPress={handleOpenWhatsApp}
              style={styles.whatsappButton}
              buttonColor="#25D366"
            >
              {t('help.whatsapp')}
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
    backgroundColor: '#f5f5f5',
  },
  container: {
    flex: 1,
    padding: 16,
  },
  card: {
    marginBottom: 16,
    borderRadius: 12,
  },
  quickHelpHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  sectionTitle: {
    fontWeight: '600',
    color: '#1f2937',
  },
  description: {
    color: '#666',
    lineHeight: 22,
  },
  faqItem: {
    paddingVertical: 4,
  },
  faqAnswer: {
    color: '#4b5563',
    lineHeight: 20,
  },
  input: {
    marginBottom: 12,
    backgroundColor: '#fff',
  },
  sendButton: {
    marginBottom: 8,
  },
  whatsappButton: {
    marginTop: 4,
  },
})
