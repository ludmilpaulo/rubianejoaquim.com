import React, { useCallback, useEffect, useState } from 'react'
import { Alert, RefreshControl, ScrollView, StyleSheet, View } from 'react-native'
import { Button, Text, TextInput } from 'react-native-paper'
import { SafeAreaView } from 'react-native-safe-area-context'
import { walletApi } from '../../services/api'
import { useI18n } from '../../contexts/I18nContext'
import ZendaLoader from '../../components/ui/ZendaLoader'
import ZendaCard from '../../components/ui/ZendaCard'
import { colors, spacing, typography } from '../../theme'

export default function WalletHomeScreen() {
  const { t } = useI18n()
  const [loading, setLoading] = useState(true)
  const [wallet, setWallet] = useState<{ accounts?: Array<{ currency: string; balance: string }>; kyc_status?: string } | null>(null)
  const [status, setStatus] = useState<{ live_enabled?: boolean; message?: string } | null>(null)
  const [amount, setAmount] = useState('')
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    try {
      const [w, s] = await Promise.all([walletApi.getWallet(), walletApi.getStatus()])
      setWallet(w)
      setStatus(s)
    } catch {
      Alert.alert(t('common.error'))
    } finally {
      setLoading(false)
    }
  }, [t])

  useEffect(() => {
    load()
  }, [load])

  const sandboxDeposit = async () => {
    if (!amount || Number(amount) <= 0) return
    setBusy(true)
    try {
      await walletApi.transfer({
        amount,
        currency: 'AOA',
        transaction_type: 'deposit',
        idempotency_key: `dep-${Date.now()}`,
      })
      setAmount('')
      await load()
      Alert.alert(t('common.success'), t('wallet.depositSuccess'))
    } catch {
      Alert.alert(t('common.error'))
    } finally {
      setBusy(false)
    }
  }

  if (loading) return <ZendaLoader message={t('wallet.loading')} />

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView refreshControl={<RefreshControl refreshing={false} onRefresh={load} />} contentContainerStyle={styles.scroll}>
        <Text style={styles.title}>{t('wallet.title')}</Text>
        {status?.live_enabled === false ? (
          <ZendaCard style={styles.banner}>
            <Text style={styles.bannerText}>{t('wallet.sandboxOnly')}</Text>
          </ZendaCard>
        ) : null}

        {(wallet?.accounts || []).map((acc) => (
          <ZendaCard key={acc.currency} style={styles.card}>
            <Text style={styles.balance}>{acc.balance} {acc.currency}</Text>
          </ZendaCard>
        ))}

        <Text style={styles.section}>{t('wallet.sandboxDeposit')}</Text>
        <TextInput label={t('wallet.amount')} value={amount} onChangeText={setAmount} keyboardType="decimal-pad" mode="outlined" />
        <Button mode="contained" loading={busy} onPress={sandboxDeposit} style={styles.btn}>
          {t('wallet.addFunds')}
        </Button>
        <Text style={styles.kyc}>{t('wallet.kyc')}: {wallet?.kyc_status || 'none'}</Text>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background.default },
  scroll: { padding: spacing.md },
  title: { ...typography.h2, marginBottom: spacing.md },
  banner: { backgroundColor: colors.warning + '22', marginBottom: spacing.md },
  bannerText: { color: colors.warning },
  card: { marginBottom: spacing.sm },
  balance: { ...typography.h2 },
  section: { ...typography.h3, marginTop: spacing.lg, marginBottom: spacing.sm },
  btn: { marginTop: spacing.md },
  kyc: { ...typography.caption, marginTop: spacing.lg, color: colors.text.secondary },
})
