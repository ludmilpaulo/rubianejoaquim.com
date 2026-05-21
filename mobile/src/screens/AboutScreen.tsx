import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { View, StyleSheet, ScrollView, Linking, RefreshControl } from 'react-native'
import { Text, Card, Button, ActivityIndicator } from 'react-native-paper'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useI18n } from '../contexts/I18nContext'
import { publicApi } from '../services/api'
import type { PublicSiteSettings, PublicZendaContent } from '../types/api'
import { colors, radius, spacing } from '../theme'

const WEBSITE_URL = 'https://www.rubianejoaquim.com'
const DEFAULT_WHATSAPP = '244944905246'
const DEFAULT_EMAIL = 'contacto@rubianejoaquim.com'

export default function AboutScreen() {
  const { t, tw, locale } = useI18n()
  const [zenda, setZenda] = useState<PublicZendaContent>({})
  const [settings, setSettings] = useState<PublicSiteSettings>({})
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState(false)

  const loadContent = useCallback(async () => {
    try {
      setError(false)
      const [zendaContent, siteSettings] = await Promise.all([
        publicApi.getZenda(locale),
        publicApi.getSiteSettings(locale),
      ])
      setZenda(zendaContent)
      setSettings(siteSettings)
    } catch {
      setError(true)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [locale])

  useEffect(() => {
    setLoading(true)
    loadContent()
  }, [loadContent])

  const onRefresh = () => {
    setRefreshing(true)
    loadContent()
  }

  const benefits = useMemo(() => {
    if (zenda.benefits?.length) return zenda.benefits
    return [
      t('about.featurePersonal'),
      t('about.featureBusiness'),
      t('about.featureEducation'),
      t('about.featureGoals'),
      t('about.featureAiAdvice'),
    ]
  }, [zenda.benefits, t])

  const featureCards = zenda.features?.slice(0, 4) ?? []
  const whatsapp = settings.whatsapp_number || DEFAULT_WHATSAPP
  const email = settings.contact_email || DEFAULT_EMAIL
  const title = zenda.headline || t('home.zendaTitle')
  const subtitle = zenda.subheadline || settings.brand_tagline || t('about.tagline')
  const intro = zenda.what_is || t('about.aboutIntro')
  const mission = zenda.who_it_helps || t('about.missionBody')

  const handleOpenWebsite = () => {
    Linking.openURL(WEBSITE_URL)
  }

  const handleOpenWhatsApp = () => {
    Linking.openURL(`https://wa.me/${whatsapp}`)
  }

  const handleOpenEmail = () => {
    Linking.openURL(`mailto:${email}`)
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.brand.primary} />
        }
      >
        <View style={styles.logoSection}>
          <View style={styles.logoContainer}>
            <MaterialCommunityIcons name="wallet" size={58} color={colors.brand.primary} />
          </View>
          <Text variant="headlineMedium" style={styles.appName}>
            {title}
          </Text>
          <Text variant="bodyMedium" style={styles.tagline}>
            {subtitle}
          </Text>
          {loading && <ActivityIndicator style={styles.loading} color={colors.brand.primary} />}
        </View>

        {error && (
          <Card style={[styles.card, styles.errorCard]}>
            <Card.Content>
              <Text variant="bodyMedium" style={styles.errorText}>
                {t('common.error')}
              </Text>
              <Button mode="text" onPress={loadContent}>
                {t('common.retry')}
              </Button>
            </Card.Content>
          </Card>
        )}

        <Card style={styles.card}>
          <Card.Content>
            <Text variant="titleLarge" style={styles.sectionTitle}>
              {settings.what_is_label || t('about.aboutTitle')}
            </Text>
            <Text variant="bodyMedium" style={styles.description}>
              {intro}
            </Text>
            <View style={styles.featuresList}>
              {benefits.map((feature) => (
                <View key={feature} style={styles.featureItem}>
                  <MaterialCommunityIcons name="check-circle" size={20} color={colors.brand.secondary} />
                  <Text variant="bodyMedium" style={styles.featureText}>
                    {feature}
                  </Text>
                </View>
              ))}
            </View>
          </Card.Content>
        </Card>

        {featureCards.length > 0 && (
          <Card style={styles.card}>
            <Card.Content>
              <Text variant="titleLarge" style={styles.sectionTitle}>
                {t('home.quickActions')}
              </Text>
              <View style={styles.featureGrid}>
                {featureCards.map((feature) => (
                  <View key={feature.id} style={styles.featureCard}>
                    <View style={styles.featureIcon}>
                      <MaterialCommunityIcons name="star-four-points" size={20} color={colors.brand.primary} />
                    </View>
                    <Text variant="titleSmall" style={styles.featureCardTitle}>
                      {feature.title}
                    </Text>
                    <Text variant="bodySmall" style={styles.featureCardText}>
                      {feature.description}
                    </Text>
                  </View>
                ))}
              </View>
            </Card.Content>
          </Card>
        )}

        <Card style={styles.card}>
          <Card.Content>
            <Text variant="titleLarge" style={styles.sectionTitle}>
              {settings.who_label || t('about.missionTitle')}
            </Text>
            <Text variant="bodyMedium" style={styles.description}>
              {mission}
            </Text>
          </Card.Content>
        </Card>

        <Card style={styles.card}>
          <Card.Content>
            <Text variant="titleLarge" style={styles.sectionTitle}>
              {settings.contact_title || t('about.contactTitle')}
            </Text>
            {settings.contact_subtitle && (
              <Text variant="bodyMedium" style={styles.description}>
                {settings.contact_subtitle}
              </Text>
            )}
            <Button
              mode="outlined"
              icon="web"
              onPress={handleOpenWebsite}
              style={styles.contactButton}
              contentStyle={styles.buttonContent}
            >
              {t('about.visitWebsite')}
            </Button>
            <Button
              mode="contained-tonal"
              icon="whatsapp"
              onPress={handleOpenWhatsApp}
              style={styles.contactButton}
              contentStyle={styles.buttonContent}
              buttonColor="#DCFCE7"
              textColor="#047857"
            >
              {t('help.whatsapp')}
            </Button>
            <Button
              mode="outlined"
              icon="email"
              onPress={handleOpenEmail}
              style={styles.contactButton}
              contentStyle={styles.buttonContent}
            >
              {t('help.sendEmail')}
            </Button>
          </Card.Content>
        </Card>

        <View style={styles.versionSection}>
          <Text variant="bodySmall" style={styles.versionText}>
            {tw('about.version', { version: '1.0.3' })}
          </Text>
          <Text variant="bodySmall" style={styles.copyrightText}>
            {tw('about.copyright', { year: String(new Date().getFullYear()) })}
          </Text>
          <Text variant="bodySmall" style={styles.copyrightText}>
            {t('about.rightsReserved')}
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background.default,
  },
  container: {
    flex: 1,
  },
  content: {
    padding: spacing.md,
    paddingBottom: spacing.xxl,
  },
  logoSection: {
    alignItems: 'center',
    marginBottom: spacing.lg,
    paddingTop: spacing.sm,
  },
  logoContainer: {
    width: 112,
    height: 112,
    borderRadius: 56,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
    borderWidth: 3,
    borderColor: '#E0E7FF',
  },
  appName: {
    fontWeight: '700',
    color: colors.text.primary,
    marginBottom: spacing.xs,
    textAlign: 'center',
  },
  tagline: {
    color: colors.text.secondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  loading: {
    marginTop: spacing.md,
  },
  card: {
    marginBottom: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: colors.background.paper,
  },
  errorCard: {
    backgroundColor: '#FEF2F2',
  },
  errorText: {
    color: colors.brand.danger,
    textAlign: 'center',
  },
  sectionTitle: {
    fontWeight: '700',
    marginBottom: spacing.sm,
    color: colors.text.primary,
  },
  description: {
    color: colors.text.secondary,
    lineHeight: 22,
    marginBottom: spacing.sm,
  },
  featuresList: {
    gap: spacing.sm,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  featureText: {
    flex: 1,
    color: colors.text.primary,
  },
  featureGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  featureCard: {
    width: '48%',
    minWidth: 140,
    padding: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  featureIcon: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EEF2FF',
    marginBottom: spacing.sm,
  },
  featureCardTitle: {
    color: colors.text.primary,
    fontWeight: '700',
    marginBottom: 4,
  },
  featureCardText: {
    color: colors.text.secondary,
    lineHeight: 18,
  },
  contactButton: {
    marginBottom: spacing.sm,
  },
  buttonContent: {
    paddingVertical: 4,
  },
  versionSection: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
    gap: 4,
  },
  versionText: {
    color: colors.text.muted,
  },
  copyrightText: {
    color: colors.text.muted,
    textAlign: 'center',
  },
})
