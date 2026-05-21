import React, { useState } from 'react'
import { Alert, ScrollView, StyleSheet, View } from 'react-native'
import { Button, Text } from 'react-native-paper'
import * as DocumentPicker from 'expo-document-picker'
import { SafeAreaView } from 'react-native-safe-area-context'
import { receiptApi } from '../services/api'
import { useI18n } from '../contexts/I18nContext'
import ZendaCard from '../components/ui/ZendaCard'
import { colors, spacing, typography } from '../theme'

export default function ReceiptScannerScreen() {
  const { t } = useI18n()
  const [receipts, setReceipts] = useState<any[]>([])
  const [uploading, setUploading] = useState(false)

  const load = () => {
    receiptApi.list().then(setReceipts).catch(() => setReceipts([]))
  }

  const pickAndUpload = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['image/*', 'application/pdf'],
        copyToCacheDirectory: true,
      })
      if (result.canceled || !result.assets?.[0]) return
      const asset = result.assets[0]
      setUploading(true)
      const form = new FormData()
      form.append('file', {
        uri: asset.uri,
        name: asset.name || 'receipt.jpg',
        type: asset.mimeType || 'image/jpeg',
      } as any)
      await receiptApi.upload(form)
      load()
      Alert.alert(t('common.success'), t('receipt.uploaded'))
    } catch {
      Alert.alert(t('common.error'))
    } finally {
      setUploading(false)
    }
  }

  React.useEffect(() => { load() }, [])

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>{t('receipt.title')}</Text>
        <Text style={styles.sub}>{t('receipt.subtitle')}</Text>
        <Button mode="contained" icon="camera" onPress={pickAndUpload} loading={uploading} style={styles.btn}>
          {t('receipt.scan')}
        </Button>
        {receipts.map((r) => (
          <ZendaCard key={r.id}>
            <Text style={styles.merchant}>{r.merchant || t('receipt.unknown')}</Text>
            <Text style={styles.amount}>{r.amount ? `${r.amount} ${r.currency}` : '—'}</Text>
            <Text style={styles.status}>{r.status}</Text>
          </ZendaCard>
        ))}
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background.default },
  content: { padding: spacing.md },
  title: { ...typography.h1, color: colors.text.primary },
  sub: { ...typography.body, color: colors.text.secondary, marginBottom: spacing.lg },
  btn: { marginBottom: spacing.lg, borderRadius: 12 },
  merchant: { ...typography.h3, color: colors.text.primary },
  amount: { ...typography.body, color: colors.brand.secondary, marginTop: 4 },
  status: { ...typography.caption, color: colors.text.muted, marginTop: 4 },
})
