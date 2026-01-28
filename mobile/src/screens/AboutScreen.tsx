import React from 'react'
import { View, StyleSheet, ScrollView, Linking } from 'react-native'
import { Text, Card, Button } from 'react-native-paper'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { SafeAreaView } from 'react-native-safe-area-context'

export default function AboutScreen() {
  const handleOpenWebsite = () => {
    Linking.openURL('https://www.rubianejoaquim.com')
  }

  const handleOpenWhatsApp = () => {
    Linking.openURL('https://wa.me/244944905246')
  }

  const handleOpenEmail = () => {
    Linking.openURL('mailto:contacto@rubianejoaquim.com')
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView style={styles.container}>
        {/* Logo/Icon Section */}
        <View style={styles.logoSection}>
          <View style={styles.logoContainer}>
            <MaterialCommunityIcons name="wallet" size={64} color="#6366f1" />
          </View>
          <Text variant="headlineMedium" style={styles.appName}>Zenda</Text>
          <Text variant="bodyMedium" style={styles.tagline}>
            One app. Your money. Your life. Your business.
          </Text>
        </View>

        {/* About Section */}
        <Card style={styles.card}>
          <Card.Content>
            <Text variant="titleLarge" style={styles.sectionTitle}>Sobre o Zenda</Text>
            <Text variant="bodyMedium" style={styles.description}>
              O Zenda é a sua plataforma completa de gestão financeira pessoal e empresarial. 
              Desenvolvido por Rubiane Joaquim Educação Financeira, o app ajuda-o a:
            </Text>
            <View style={styles.featuresList}>
              <View style={styles.featureItem}>
                <MaterialCommunityIcons name="check-circle" size={20} color="#10b981" />
                <Text variant="bodyMedium" style={styles.featureText}>
                  Gerir despesas e orçamentos pessoais
                </Text>
              </View>
              <View style={styles.featureItem}>
                <MaterialCommunityIcons name="check-circle" size={20} color="#10b981" />
                <Text variant="bodyMedium" style={styles.featureText}>
                  Controlar finanças do seu negócio
                </Text>
              </View>
              <View style={styles.featureItem}>
                <MaterialCommunityIcons name="check-circle" size={20} color="#10b981" />
                <Text variant="bodyMedium" style={styles.featureText}>
                  Acompanhar cursos de educação financeira
                </Text>
              </View>
              <View style={styles.featureItem}>
                <MaterialCommunityIcons name="check-circle" size={20} color="#10b981" />
                <Text variant="bodyMedium" style={styles.featureText}>
                  Definir e alcançar objetivos financeiros
                </Text>
              </View>
              <View style={styles.featureItem}>
                <MaterialCommunityIcons name="check-circle" size={20} color="#10b981" />
                <Text variant="bodyMedium" style={styles.featureText}>
                  Receber conselhos personalizados com AI
                </Text>
              </View>
            </View>
          </Card.Content>
        </Card>

        {/* Mission Section */}
        <Card style={styles.card}>
          <Card.Content>
            <Text variant="titleLarge" style={styles.sectionTitle}>Missão</Text>
            <Text variant="bodyMedium" style={styles.description}>
              Tornar a educação financeira acessível a todos, através de ferramentas práticas 
              e cursos que ajudam a alcançar a liberdade financeira.
            </Text>
          </Card.Content>
        </Card>

        {/* Contact Section */}
        <Card style={styles.card}>
          <Card.Content>
            <Text variant="titleLarge" style={styles.sectionTitle}>Contacto</Text>
            <Button
              mode="outlined"
              icon="web"
              onPress={handleOpenWebsite}
              style={styles.contactButton}
              contentStyle={styles.buttonContent}
            >
              Visitar Website
            </Button>
            <Button
              mode="outlined"
              icon="whatsapp"
              onPress={handleOpenWhatsApp}
              style={styles.contactButton}
              contentStyle={styles.buttonContent}
              buttonColor="#25D366"
            >
              WhatsApp
            </Button>
            <Button
              mode="outlined"
              icon="email"
              onPress={handleOpenEmail}
              style={styles.contactButton}
              contentStyle={styles.buttonContent}
            >
              Email
            </Button>
          </Card.Content>
        </Card>

        {/* Version Info */}
        <View style={styles.versionSection}>
          <Text variant="bodySmall" style={styles.versionText}>Versão 1.0.0</Text>
          <Text variant="bodySmall" style={styles.copyrightText}>
            © 2026 Rubiane Joaquim Educação Financeira
          </Text>
          <Text variant="bodySmall" style={styles.copyrightText}>
            Todos os direitos reservados
          </Text>
        </View>
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
  logoSection: {
    alignItems: 'center',
    padding: 32,
    paddingTop: 24,
  },
  logoContainer: {
    width: 120,
    height: 120,
    borderRadius: 30,
    backgroundColor: '#f0f4ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 3,
    borderColor: '#e0e7ff',
  },
  appName: {
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  tagline: {
    color: '#6b7280',
    textAlign: 'center',
  },
  card: {
    margin: 16,
    marginBottom: 0,
    borderRadius: 16,
    elevation: 2,
    backgroundColor: '#ffffff',
  },
  sectionTitle: {
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 16,
    letterSpacing: -0.3,
  },
  description: {
    color: '#374151',
    lineHeight: 24,
    marginBottom: 16,
  },
  featuresList: {
    gap: 12,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  featureText: {
    flex: 1,
    color: '#374151',
  },
  contactButton: {
    marginBottom: 12,
    borderRadius: 12,
  },
  buttonContent: {
    paddingVertical: 8,
  },
  versionSection: {
    alignItems: 'center',
    padding: 24,
    marginBottom: 16,
  },
  versionText: {
    color: '#6b7280',
    marginBottom: 8,
  },
  copyrightText: {
    color: '#9ca3af',
    fontSize: 12,
    marginBottom: 4,
  },
})
