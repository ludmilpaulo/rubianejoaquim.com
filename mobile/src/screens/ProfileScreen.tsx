import React, { useState, useEffect, useCallback } from 'react'
import { View, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator, Platform } from 'react-native'
import { Text, Card, Button, Divider, TextInput } from 'react-native-paper'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { SafeAreaView } from 'react-native-safe-area-context'
import * as DocumentPicker from 'expo-document-picker'
import { useAppDispatch, useAppSelector } from '../hooks/redux'
import { logout, checkPaidAccess } from '../store/authSlice'
import { useNavigation } from '@react-navigation/native'
import { authApi, accessApi } from '../services/api'
import type { MobileAppSubscription, SubscriptionPaymentInfo } from '../types'

export default function ProfileScreen() {
  const dispatch = useAppDispatch()
  const { user } = useAppSelector((state) => state.auth)
  const navigation = useNavigation<any>()
  const [subscription, setSubscription] = useState<MobileAppSubscription | null>(null)
  const [paymentInfo, setPaymentInfo] = useState<SubscriptionPaymentInfo | null>(null)
  const [subLoading, setSubLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [uploadNotes, setUploadNotes] = useState('')

  const loadSubscription = useCallback(async () => {
    try {
      setSubLoading(true)
      const [subRes, payRes] = await Promise.all([
        accessApi.getMobileSubscription().catch(() => null),
        accessApi.getSubscriptionPaymentInfo().catch(() => null),
      ])
      setSubscription(subRes?.subscription ?? subRes ?? null)
      setPaymentInfo(payRes ?? null)
    } catch {
      setSubscription(null)
      setPaymentInfo(null)
    } finally {
      setSubLoading(false)
    }
  }, [])

  useEffect(() => {
    loadSubscription()
  }, [loadSubscription])

  const handleLogout = () => {
    dispatch(logout())
  }

  const handlePickAndUploadProof = async () => {
    if (!subscription?.id) return
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['image/*', 'application/pdf'],
        copyToCacheDirectory: true,
      })
      if (result.canceled) return
      const file = result.assets[0]
      setUploading(true)
      const filePayload = {
        uri: file.uri,
        name: file.name ?? `proof_${Date.now()}.jpg`,
        type: file.mimeType ?? 'image/jpeg',
      }
      await accessApi.uploadSubscriptionPaymentProof(subscription.id, filePayload as any, uploadNotes || undefined)
      setUploadNotes('')
      Alert.alert(
        'Comprovativo enviado',
        'O seu comprovativo foi recebido. A subscrição será ativada após validação pela nossa equipa. Obrigado!'
      )
      await loadSubscription()
      dispatch(checkPaidAccess())
    } catch (error: any) {
      const msg = error?.response?.data?.detail ?? error?.response?.data?.error ?? error?.message ?? 'Não foi possível enviar o ficheiro.'
      Alert.alert('Erro', msg)
    } finally {
      setUploading(false)
    }
  }

  const handleRequestAccountDeletion = () => {
    Alert.alert(
      'Solicitar Exclusão de Conta',
      'Tem certeza que deseja solicitar a exclusão da sua conta e de todos os dados associados?\n\nEsta ação não pode ser desfeita. Todos os seus dados serão removidos permanentemente.',
      [
        {
          text: 'Cancelar',
          style: 'cancel',
        },
        {
          text: 'Solicitar Exclusão',
          style: 'destructive',
          onPress: async () => {
            try {
              await authApi.requestAccountDeletion()
              Alert.alert(
                'Solicitação Recebida',
                'Sua solicitação de exclusão de conta foi recebida. Sua conta e dados associados serão removidos em breve.\n\nVocê será desconectado agora.',
                [
                  {
                    text: 'OK',
                    onPress: () => {
                      dispatch(logout())
                    },
                  },
                ]
              )
            } catch (error: any) {
              Alert.alert(
                'Erro',
                error.response?.data?.error || error.message || 'Erro ao solicitar exclusão de conta. Por favor, tente novamente.'
              )
            }
          },
        },
      ]
    )
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView style={styles.container}>
        {/* Profile Header Card */}
        <Card style={styles.profileCard}>
          <Card.Content style={styles.profileContent}>
            <View style={styles.profileHeader}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>
                  {user?.first_name?.[0]?.toUpperCase() || 'U'}
                </Text>
              </View>
              <View style={styles.profileInfo}>
                <Text variant="titleLarge" style={styles.name}>
                  {user?.first_name} {user?.last_name}
                </Text>
                <Text variant="bodyMedium" style={styles.email}>
                  {user?.email}
                </Text>
                {user?.phone && (
                  <Text variant="bodySmall" style={styles.phone}>
                    {user.phone}
                  </Text>
                )}
              </View>
            </View>
          </Card.Content>
        </Card>

        {/* Subscription Card — shown when user has a mobile subscription */}
        {!subLoading && subscription && (
          <Card style={styles.subscriptionCard}>
            <View style={styles.subscriptionCardInner}>
            <Card.Content style={styles.subscriptionContent}>
              <View style={styles.subscriptionHeader}>
                <View style={styles.subscriptionTitleRow}>
                  <MaterialCommunityIcons name="shield-check" size={28} color="#6366f1" />
                  <Text variant="titleLarge" style={styles.subscriptionTitle}>
                    Minha subscrição
                  </Text>
                </View>
                {subscription && (
                  <View
                    style={[
                      styles.badge,
                      subscription.status === 'trial' && styles.badgeTrial,
                      subscription.status === 'active' && styles.badgeActive,
                      (subscription.status === 'expired' || subscription.status === 'cancelled') && styles.badgeExpired,
                    ]}
                  >
                    <Text
                      style={[
                        styles.badgeText,
                        subscription.status === 'trial' && styles.badgeTextTrial,
                        subscription.status === 'active' && styles.badgeTextActive,
                        (subscription.status === 'expired' || subscription.status === 'cancelled') && styles.badgeTextExpired,
                      ]}
                    >
                      {subscription.status === 'trial' && 'Semana grátis'}
                      {subscription.status === 'active' && 'Ativo'}
                      {(subscription.status === 'expired' || subscription.status === 'cancelled') && 'Expirado'}
                    </Text>
                  </View>
                )}
              </View>

              {subscription?.status === 'trial' && subscription.days_until_expiry != null && subscription.days_until_expiry <= 3 && (
                <View style={styles.reminderBanner}>
                  <MaterialCommunityIcons name="information" size={20} color="#6366f1" />
                  <Text variant="bodySmall" style={styles.reminderBannerText}>
                    A sua semana grátis termina em breve. Subscreva agora para continuar a usar o Zenda sem interrupções.
                  </Text>
                </View>
              )}

              {subscription?.status === 'trial' && (
                <>
                  <View style={styles.subscriptionStatusRow}>
                    <MaterialCommunityIcons name="calendar-clock" size={20} color="#6366f1" />
                    <Text variant="bodyLarge" style={styles.subscriptionStatusText}>
                      {subscription.days_until_expiry != null
                        ? `${subscription.days_until_expiry} ${subscription.days_until_expiry === 1 ? 'dia' : 'dias'} restantes na sua semana grátis`
                        : 'Período de teste ativo'}
                    </Text>
                  </View>
                  <Text variant="bodyMedium" style={styles.subscriptionHint}>
                    Pode passar a subscrição mensal a qualquer momento. Efetue o pagamento e envie o comprovativo abaixo.
                  </Text>
                </>
              )}

              {subscription?.status === 'active' && subscription.subscription_ends_at && (
                <View style={styles.subscriptionStatusRow}>
                  <MaterialCommunityIcons name="check-circle" size={20} color="#10b981" />
                  <Text variant="bodyLarge" style={styles.subscriptionStatusText}>
                    Subscrição ativa até {new Date(subscription.subscription_ends_at).toLocaleDateString('pt-AO', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </Text>
                </View>
              )}

              {(subscription?.status === 'expired' || subscription?.status === 'cancelled') && (
                <Text variant="bodyMedium" style={styles.subscriptionHint}>
                  Envie um comprovativo de pagamento para renovar o acesso ao Zenda.
                </Text>
              )}

              {paymentInfo && (subscription?.status === 'trial' || subscription?.status === 'expired' || subscription?.status === 'cancelled') && (
                <View style={styles.paymentDetails}>
                  <Text variant="labelLarge" style={styles.paymentDetailsTitle}>
                    Dados para pagamento mensal
                  </Text>
                  <View style={styles.paymentRow}>
                    <Text variant="bodySmall" style={styles.paymentLabel}>Valor</Text>
                    <Text variant="bodyLarge" style={styles.paymentValue}>
                      {paymentInfo.monthly_price_kz.toLocaleString('pt-AO')} AOA/mês
                    </Text>
                  </View>
                  <View style={styles.paymentRow}>
                    <Text variant="bodySmall" style={styles.paymentLabel}>IBAN</Text>
                    <Text variant="bodyMedium" style={styles.paymentValue} selectable>
                      {paymentInfo.iban}
                    </Text>
                  </View>
                  <View style={styles.paymentRow}>
                    <Text variant="bodySmall" style={styles.paymentLabel}>Beneficiário</Text>
                    <Text variant="bodyMedium" style={styles.paymentValue} selectable>
                      {paymentInfo.payee_name}
                    </Text>
                  </View>
                </View>
              )}

              {subscription && subscription.status !== 'cancelled' && (
                <View style={styles.uploadSection}>
                  <TextInput
                    mode="outlined"
                    label="Notas (opcional)"
                    placeholder="Ex: Referência do transferência"
                    value={uploadNotes}
                    onChangeText={setUploadNotes}
                    style={styles.notesInput}
                    outlineColor="#e0e7ff"
                    activeOutlineColor="#6366f1"
                  />
                  <Button
                    mode="contained"
                    onPress={handlePickAndUploadProof}
                    loading={uploading}
                    disabled={uploading}
                    style={styles.uploadButton}
                    buttonColor="#6366f1"
                    contentStyle={styles.uploadButtonContent}
                    labelStyle={styles.uploadButtonLabel}
                    icon={() => <MaterialCommunityIcons name="upload" size={22} color="#fff" />}
                  >
                    {uploading ? 'A enviar...' : 'Enviar comprovativo de pagamento'}
                  </Button>
                  <Text variant="bodySmall" style={styles.uploadHint}>
                    Fotografia ou PDF do comprovativo de transferência
                  </Text>
                </View>
              )}
            </Card.Content>
            </View>
          </Card>
        )}

        {subLoading && (
          <Card style={styles.subscriptionCard}>
            <View style={styles.subscriptionCardInner}>
              <Card.Content style={styles.subscriptionContent}>
                <ActivityIndicator size="large" color="#6366f1" style={{ marginVertical: 24 }} />
                <Text variant="bodyMedium" style={{ textAlign: 'center', color: '#6b7280' }}>
                  A carregar subscrição...
                </Text>
              </Card.Content>
            </View>
          </Card>
        )}

        {/* Menu Options */}
        <Card style={styles.card}>
          <Card.Content>
            <TouchableOpacity
              onPress={() => navigation.navigate('Settings')}
              activeOpacity={0.7}
            >
              <View style={styles.menuItem}>
                <View style={styles.menuItemLeft}>
                  <View style={[styles.menuIconContainer, { backgroundColor: '#f0f4ff' }]}>
                    <MaterialCommunityIcons name="cog" size={24} color="#6366f1" />
                  </View>
                  <View style={styles.menuItemText}>
                    <Text variant="titleMedium" style={styles.menuItemTitle}>
                      Configurações
                    </Text>
                    <Text variant="bodySmall" style={styles.menuItemSubtitle}>
                      Preferências e configurações da conta
                    </Text>
                  </View>
                </View>
                <MaterialCommunityIcons name="chevron-right" size={24} color="#9ca3af" />
              </View>
            </TouchableOpacity>
            <Divider style={styles.divider} />
            <TouchableOpacity
              onPress={() => navigation.navigate('About')}
              activeOpacity={0.7}
            >
              <View style={styles.menuItem}>
                <View style={styles.menuItemLeft}>
                  <View style={[styles.menuIconContainer, { backgroundColor: '#ecfdf5' }]}>
                    <MaterialCommunityIcons name="information" size={24} color="#10b981" />
                  </View>
                  <View style={styles.menuItemText}>
                    <Text variant="titleMedium" style={styles.menuItemTitle}>
                      Sobre o Zenda
                    </Text>
                    <Text variant="bodySmall" style={styles.menuItemSubtitle}>
                      Informações sobre o app e a missão
                    </Text>
                  </View>
                </View>
                <MaterialCommunityIcons name="chevron-right" size={24} color="#9ca3af" />
              </View>
            </TouchableOpacity>
            <Divider style={styles.divider} />
            <TouchableOpacity
              onPress={() => navigation.navigate('HelpSupport')}
              activeOpacity={0.7}
            >
              <View style={styles.menuItem}>
                <View style={styles.menuItemLeft}>
                  <View style={[styles.menuIconContainer, { backgroundColor: '#fffbeb' }]}>
                    <MaterialCommunityIcons name="help-circle" size={24} color="#f59e0b" />
                  </View>
                  <View style={styles.menuItemText}>
                    <Text variant="titleMedium" style={styles.menuItemTitle}>
                      Ajuda e Suporte
                    </Text>
                    <Text variant="bodySmall" style={styles.menuItemSubtitle}>
                      FAQ e contacto para suporte
                    </Text>
                  </View>
                </View>
                <MaterialCommunityIcons name="chevron-right" size={24} color="#9ca3af" />
              </View>
            </TouchableOpacity>
            <Divider style={styles.divider} />
            <TouchableOpacity
              onPress={handleRequestAccountDeletion}
              activeOpacity={0.7}
            >
              <View style={styles.menuItem}>
                <View style={styles.menuItemLeft}>
                  <View style={[styles.menuIconContainer, { backgroundColor: '#fee2e2' }]}>
                    <MaterialCommunityIcons name="delete-forever" size={24} color="#ef4444" />
                  </View>
                  <View style={styles.menuItemText}>
                    <Text variant="titleMedium" style={[styles.menuItemTitle, styles.deleteTitle]}>
                      Solicitar Exclusão de Conta
                    </Text>
                    <Text variant="bodySmall" style={styles.menuItemSubtitle}>
                      Remover conta e todos os dados associados
                    </Text>
                  </View>
                </View>
                <MaterialCommunityIcons name="chevron-right" size={24} color="#9ca3af" />
              </View>
            </TouchableOpacity>
          </Card.Content>
        </Card>

        {/* Logout Button */}
        <View style={styles.logoutContainer}>
          <Button
            mode="contained"
            onPress={handleLogout}
            buttonColor="#ef4444"
            style={styles.logoutButton}
            contentStyle={styles.logoutButtonContent}
            labelStyle={styles.logoutButtonLabel}
            icon="logout"
          >
            Sair da Conta
          </Button>
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
  profileCard: {
    margin: 16,
    marginBottom: 0,
    borderRadius: 20,
    elevation: 4,
    backgroundColor: '#ffffff',
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  profileContent: {
    padding: 20,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#6366f1',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#e0e7ff',
  },
  avatarText: {
    color: '#fff',
    fontSize: 32,
    fontWeight: '700',
  },
  profileInfo: {
    marginLeft: 20,
    flex: 1,
  },
  name: {
    fontWeight: '700',
    marginBottom: 6,
    color: '#1f2937',
    letterSpacing: -0.5,
  },
  email: {
    color: '#6b7280',
    marginBottom: 4,
  },
  phone: {
    color: '#9ca3af',
  },
  card: {
    margin: 16,
    marginTop: 16,
    borderRadius: 20,
    elevation: 2,
    backgroundColor: '#ffffff',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  menuIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  menuItemText: {
    flex: 1,
  },
  menuItemTitle: {
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
  },
  menuItemSubtitle: {
    color: '#6b7280',
    fontSize: 13,
  },
  divider: {
    marginVertical: 0,
    backgroundColor: '#e5e7eb',
  },
  logoutContainer: {
    padding: 16,
    paddingTop: 8,
  },
  logoutButton: {
    borderRadius: 12,
    elevation: 2,
  },
  logoutButtonContent: {
    paddingVertical: 8,
    height: 52,
  },
  logoutButtonLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  deleteTitle: {
    color: '#ef4444',
  },
  subscriptionCard: {
    margin: 16,
    marginTop: 16,
    borderRadius: 20,
    elevation: 4,
    backgroundColor: '#ffffff',
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
  },
  subscriptionCardInner: {
    overflow: 'hidden',
    borderRadius: 20,
  },
  subscriptionContent: {
    padding: 24,
  },
  subscriptionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    flexWrap: 'wrap',
    gap: 12,
  },
  subscriptionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  subscriptionTitle: {
    fontWeight: '700',
    color: '#1f2937',
    letterSpacing: -0.3,
  },
  badge: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  badgeTrial: {
    backgroundColor: '#eef2ff',
  },
  badgeActive: {
    backgroundColor: '#d1fae5',
  },
  badgeExpired: {
    backgroundColor: '#fee2e2',
  },
  badgeText: {
    fontSize: 13,
    fontWeight: '700',
  },
  badgeTextTrial: {
    color: '#4338ca',
  },
  badgeTextActive: {
    color: '#047857',
  },
  badgeTextExpired: {
    color: '#b91c1c',
  },
  reminderBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#eef2ff',
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#6366f1',
  },
  reminderBannerText: {
    flex: 1,
    color: '#4338ca',
    fontWeight: '500',
  },
  subscriptionStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  subscriptionStatusText: {
    color: '#374151',
    fontWeight: '500',
    flex: 1,
  },
  subscriptionHint: {
    color: '#6b7280',
    lineHeight: 22,
    marginBottom: 16,
  },
  expiredNotice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: '#fef2f2',
    padding: 14,
    borderRadius: 12,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#b91c1c',
  },
  expiredNoticeText: {
    flex: 1,
    color: '#991b1b',
    lineHeight: 22,
    fontWeight: '500',
  },
  paymentDetails: {
    backgroundColor: '#f8fafc',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  paymentDetailsTitle: {
    fontWeight: '600',
    color: '#475569',
    marginBottom: 12,
    fontSize: 13,
  },
  paymentRow: {
    marginBottom: 10,
  },
  paymentLabel: {
    color: '#64748b',
    marginBottom: 2,
    fontSize: 12,
  },
  paymentValue: {
    color: '#1e293b',
    fontWeight: '500',
  },
  uploadSection: {
    marginTop: 4,
  },
  notesInput: {
    backgroundColor: '#fff',
    marginBottom: 12,
  },
  uploadButton: {
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
  },
  uploadButtonContent: {
    paddingVertical: 10,
    height: 52,
  },
  uploadButtonLabel: {
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  uploadHint: {
    color: '#9ca3af',
    marginTop: 10,
    textAlign: 'center',
  },
})
