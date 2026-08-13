import React from 'react'
import { Linking, StyleSheet, Text } from 'react-native'
import { useI18n } from '../contexts/I18nContext'
import { PRIVACY_POLICY_URL, TERMS_OF_USE_URL } from '../services/iapShared'
import { colors } from '../theme'

export default function AuthLegalFooter() {
  const { t } = useI18n()

  return (
    <Text style={styles.text}>
      {t('auth.legal.prefix')}{' '}
      <Text style={styles.link} onPress={() => void Linking.openURL(TERMS_OF_USE_URL)}>
        {t('auth.legal.terms')}
      </Text>
      {' '}
      {t('auth.legal.and')}{' '}
      <Text style={styles.link} onPress={() => void Linking.openURL(PRIVACY_POLICY_URL)}>
        {t('auth.legal.privacy')}
      </Text>
      .
    </Text>
  )
}

const styles = StyleSheet.create({
  text: {
    marginTop: 16,
    textAlign: 'center',
    fontSize: 12,
    lineHeight: 18,
    color: colors.text.muted,
  },
  link: {
    color: colors.brand.primary,
    fontWeight: '600',
  },
})
