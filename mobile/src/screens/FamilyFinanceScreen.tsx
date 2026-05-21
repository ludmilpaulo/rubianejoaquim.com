import React, { useCallback, useState } from 'react'
import { Alert, ScrollView, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native'
import { Button, Text } from 'react-native-paper'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useFocusEffect } from '@react-navigation/native'
import { financeSpaceApi } from '../services/api'
import { useI18n } from '../contexts/I18nContext'
import ZendaCard from '../components/ui/ZendaCard'
import EmptyState from '../components/ui/EmptyState'
import { colors, spacing, typography } from '../theme'

export default function FamilyFinanceScreen() {
  const { t } = useI18n()
  const [spaces, setSpaces] = useState<any[]>([])
  const [name, setName] = useState('')
  const [inviteCode, setInviteCode] = useState('')

  const load = useCallback(() => {
    financeSpaceApi.listSpaces().then(setSpaces).catch(() => setSpaces([]))
  }, [])

  useFocusEffect(useCallback(() => { load() }, [load]))

  const createSpace = async () => {
    if (!name.trim()) return
    try {
      await financeSpaceApi.createSpace(name.trim())
      setName('')
      load()
    } catch {
      Alert.alert(t('common.error'))
    }
  }

  const join = async () => {
    if (!inviteCode.trim()) return
    try {
      await financeSpaceApi.joinSpace(inviteCode.trim())
      setInviteCode('')
      load()
    } catch {
      Alert.alert(t('family.invalidCode'))
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>{t('family.title')}</Text>
        <Text style={styles.sub}>{t('family.subtitle')}</Text>

        <ZendaCard variant="glass">
          <Text style={styles.label}>{t('family.create')}</Text>
          <TextInput style={styles.input} value={name} onChangeText={setName} placeholder={t('family.spaceName')} />
          <Button mode="contained" onPress={createSpace}>{t('common.add')}</Button>
        </ZendaCard>

        <ZendaCard>
          <Text style={styles.label}>{t('family.join')}</Text>
          <TextInput style={styles.input} value={inviteCode} onChangeText={setInviteCode} placeholder={t('family.inviteCode')} autoCapitalize="characters" />
          <Button mode="outlined" onPress={join}>{t('family.joinBtn')}</Button>
        </ZendaCard>

        {spaces.length === 0 ? (
          <EmptyState icon="account-group" title={t('family.empty')} />
        ) : (
          spaces.map((s) => (
            <ZendaCard key={s.id} variant="elevated">
              <Text style={styles.spaceName}>{s.name}</Text>
              <Text style={styles.code}>{t('family.code')}: {s.invite_code}</Text>
              {(s.shared_goals || []).map((g: any) => (
                <View key={g.id} style={styles.goalRow}>
                  <Text>{g.title}</Text>
                  <Text style={styles.pct}>{Math.round(g.progress_percentage)}%</Text>
                </View>
              ))}
            </ZendaCard>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background.default },
  content: { padding: spacing.md },
  title: { ...typography.h1, color: colors.text.primary },
  sub: { ...typography.body, color: colors.text.secondary, marginBottom: spacing.lg },
  label: { ...typography.label, color: colors.text.secondary, marginBottom: spacing.sm },
  input: { borderWidth: 1, borderColor: colors.border.light, borderRadius: 8, padding: spacing.md, marginBottom: spacing.md, backgroundColor: colors.background.paper },
  spaceName: { ...typography.h3, color: colors.text.primary },
  code: { ...typography.caption, color: colors.brand.primary, marginVertical: spacing.sm },
  goalRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing.sm },
  pct: { fontWeight: '700', color: colors.brand.secondary },
})
