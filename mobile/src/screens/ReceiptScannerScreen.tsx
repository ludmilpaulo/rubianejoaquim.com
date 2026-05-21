import React, { useCallback, useEffect, useState } from 'react'
import { Alert, RefreshControl, ScrollView, StyleSheet, View } from 'react-native'
import { ActivityIndicator, Button, Text } from 'react-native-paper'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import * as DocumentPicker from 'expo-document-picker'
import { SafeAreaView } from 'react-native-safe-area-context'
import { receiptApi } from '../services/api'
import { useI18n } from '../contexts/I18nContext'
import ZendaCard from '../components/ui/ZendaCard'
import { colors, radius, spacing, typography } from '../theme'
import { formatCurrency } from '../utils/currency'

interface ReceiptItem {
  id: number
  merchant?: string | null
  vendor?: string | null
  amount?: string | number | null
  currency?: string | null
  status?: string | null
  category?: number | null
  scanned_text?: string | null
  created_at?: string | null
  is_business?: boolean
}

function statusColor(status?: string | null) {
  if (status === 'processed') return colors.brand.secondary
  if (status === 'failed') return colors.brand.danger
  return colors.brand.accent
}

export default function ReceiptScannerScreen() {
  const { t, locale } = useI18n()
  const [receipts, setReceipts] = useState<ReceiptItem[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [reprocessingId, setReprocessingId] = useState<number | null>(null)
  const [error, setError] = useState(false)

  const load = useCallback(async () => {
    try {
      setError(false)
      const list = await receiptApi.list()
      setReceipts(Array.isArray(list) ? list : [])
    } catch {
      setError(true)
      setReceipts([])
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

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
      } as unknown as Blob)
      await receiptApi.upload(form)
      await load()
      Alert.alert(t('common.success'), t('receipt.uploaded'))
    } catch {
      Alert.alert(t('common.error'))
    } finally {
      setUploading(false)
    }
  }

  const reprocess = async (id: number) => {
    try {
      setReprocessingId(id)
      const updated = await receiptApi.reprocess(id)
      setReceipts((current) => current.map((item) => (item.id === id ? updated : item)))
    } catch {
      Alert.alert(t('common.error'))
    } finally {
      setReprocessingId(null)
    }
  }

  const statusLabel = (status?: string | null) => {
    if (status === 'processed') return t('receipt.status.processed')
    if (status === 'failed') return t('receipt.status.failed')
    return t('receipt.status.pending')
  }

  const formatDate = (value?: string | null) => {
    if (!value) return ''
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return ''
    return new Intl.DateTimeFormat(locale).format(date)
  }

  useEffect(() => {
    load()
  }, [load])

  const processedCount = receipts.filter((receipt) => receipt.status === 'processed').length
  const pendingCount = receipts.filter((receipt) => receipt.status !== 'processed').length

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true)
              load()
            }}
            tintColor={colors.brand.primary}
          />
        }
      >
        <ZendaCard variant="elevated" style={styles.heroCard}>
          <View style={styles.heroTop}>
            <View style={styles.heroIcon}>
              <MaterialCommunityIcons name="receipt" size={34} color={colors.brand.secondary} />
            </View>
            <View style={styles.heroCopy}>
              <Text style={styles.title}>{t('receipt.title')}</Text>
              <Text style={styles.sub}>{t('receipt.subtitle')}</Text>
            </View>
          </View>
          <View style={styles.metricRow}>
            <View style={styles.metricPill}>
              <Text style={styles.metricValue}>{receipts.length}</Text>
              <Text style={styles.metricLabel}>{t('receipt.total')}</Text>
            </View>
            <View style={styles.metricPill}>
              <Text style={styles.metricValue}>{processedCount}</Text>
              <Text style={styles.metricLabel}>{t('receipt.processed')}</Text>
            </View>
            <View style={styles.metricPill}>
              <Text style={styles.metricValue}>{pendingCount}</Text>
              <Text style={styles.metricLabel}>{t('receipt.pending')}</Text>
            </View>
          </View>
          <Text style={styles.scanHint}>{t('receipt.scanHint')}</Text>
          <Button
            mode="contained"
            icon="upload"
            onPress={pickAndUpload}
            loading={uploading}
            disabled={uploading}
            style={styles.btn}
            contentStyle={styles.btnContent}
          >
            {t('receipt.uploadCta')}
          </Button>
        </ZendaCard>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{t('receipt.history')}</Text>
          <Button mode="text" icon="refresh" onPress={load} disabled={loading || uploading}>
            {t('common.retry')}
          </Button>
        </View>

        {loading ? (
          <View style={styles.centerState}>
            <ActivityIndicator color={colors.brand.primary} />
            <Text style={styles.centerText}>{t('common.loading')}</Text>
          </View>
        ) : error ? (
          <ZendaCard style={styles.errorCard}>
            <Text style={styles.errorText}>{t('common.error')}</Text>
            <Button mode="text" onPress={load}>
              {t('common.retry')}
            </Button>
          </ZendaCard>
        ) : receipts.length === 0 ? (
          <ZendaCard style={styles.emptyCard}>
            <MaterialCommunityIcons name="file-document-outline" size={34} color={colors.text.muted} />
            <Text style={styles.emptyTitle}>{t('receipt.emptyTitle')}</Text>
            <Text style={styles.emptyBody}>{t('receipt.emptyBody')}</Text>
          </ZendaCard>
        ) : (
          receipts.map((receipt) => {
            const amount =
              receipt.amount !== null && receipt.amount !== undefined
                ? formatCurrency(receipt.amount, receipt.currency || 'AOA')
                : t('receipt.amountMissing')
            const merchant = receipt.merchant || receipt.vendor || t('receipt.unknown')
            const tone = statusColor(receipt.status)

            return (
              <ZendaCard key={receipt.id} accentColor={tone}>
                <View style={styles.receiptHeader}>
                  <View style={styles.receiptTitleWrap}>
                    <Text style={styles.merchant} numberOfLines={1}>{merchant}</Text>
                    <Text style={styles.dateText}>{formatDate(receipt.created_at)}</Text>
                  </View>
                  <View style={[styles.statusPill, { backgroundColor: `${tone}18` }]}>
                    <Text style={[styles.statusText, { color: tone }]}>{statusLabel(receipt.status)}</Text>
                  </View>
                </View>
                <View style={styles.receiptMeta}>
                  <View>
                    <Text style={styles.metaLabel}>{t('home.expenses')}</Text>
                    <Text style={styles.amount}>{amount}</Text>
                  </View>
                  <View style={styles.metaRight}>
                    <Text style={styles.metaLabel}>{t('receipt.source')}</Text>
                    <Text style={styles.metaValue}>{receipt.is_business ? t('finance.business') : t('finance.personal')}</Text>
                  </View>
                </View>
                {receipt.scanned_text ? (
                  <Text style={styles.scannedText} numberOfLines={2}>{receipt.scanned_text}</Text>
                ) : null}
                {receipt.status !== 'processed' && (
                  <Button
                    mode="outlined"
                    icon="auto-fix"
                    onPress={() => reprocess(receipt.id)}
                    loading={reprocessingId === receipt.id}
                    disabled={reprocessingId === receipt.id}
                    style={styles.reprocessBtn}
                  >
                    {t('receipt.reprocess')}
                  </Button>
                )}
              </ZendaCard>
            )
          })
        )}
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background.default },
  content: { padding: spacing.md, paddingBottom: spacing.xxl },
  heroCard: { backgroundColor: '#FFFFFF' },
  heroTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.md },
  heroIcon: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: '#ECFDF5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroCopy: { flex: 1 },
  title: { ...typography.h1, color: colors.text.primary },
  sub: { ...typography.body, color: colors.text.secondary, marginTop: 4 },
  metricRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
  metricPill: {
    flex: 1,
    borderRadius: radius.md,
    padding: spacing.sm,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
  },
  metricValue: { color: colors.text.primary, fontSize: 18, fontWeight: '800' },
  metricLabel: { color: colors.text.secondary, fontSize: 11, marginTop: 2, textAlign: 'center' },
  scanHint: { ...typography.caption, color: colors.text.secondary, lineHeight: 18, marginBottom: spacing.md },
  btn: { borderRadius: radius.md },
  btnContent: { minHeight: 48 },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
  },
  sectionTitle: { ...typography.label, color: colors.brand.primary, textTransform: 'uppercase', letterSpacing: 0 },
  centerState: { alignItems: 'center', paddingVertical: spacing.xl, gap: spacing.sm },
  centerText: { color: colors.text.secondary },
  errorCard: { alignItems: 'center', backgroundColor: '#FEF2F2' },
  errorText: { color: colors.brand.danger, fontWeight: '700' },
  emptyCard: { alignItems: 'center', paddingVertical: spacing.xl },
  emptyTitle: { ...typography.h3, color: colors.text.primary, marginTop: spacing.sm },
  emptyBody: { ...typography.body, color: colors.text.secondary, textAlign: 'center', marginTop: 4 },
  receiptHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm, marginBottom: spacing.sm },
  receiptTitleWrap: { flex: 1 },
  merchant: { ...typography.h3, color: colors.text.primary },
  dateText: { ...typography.caption, color: colors.text.muted, marginTop: 2 },
  statusPill: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: radius.sm },
  statusText: { fontSize: 11, fontWeight: '800', textTransform: 'uppercase' },
  receiptMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border.light,
  },
  metaRight: { alignItems: 'flex-end', flex: 1 },
  metaLabel: { ...typography.caption, color: colors.text.muted, textTransform: 'uppercase' },
  metaValue: { ...typography.caption, color: colors.text.primary, fontWeight: '700', marginTop: 2 },
  amount: { ...typography.body, color: colors.brand.secondary, fontWeight: '800', marginTop: 2 },
  scannedText: { ...typography.caption, color: colors.text.secondary, marginTop: spacing.sm, lineHeight: 18 },
  reprocessBtn: { marginTop: spacing.md, borderRadius: radius.sm },
})
