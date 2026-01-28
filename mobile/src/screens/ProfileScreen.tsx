import React from 'react'
import { View, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native'
import { Text, Card, Button, List, Divider } from 'react-native-paper'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useAppDispatch, useAppSelector } from '../hooks/redux'
import { logout } from '../store/authSlice'
import { useNavigation } from '@react-navigation/native'
import { authApi } from '../services/api'

export default function ProfileScreen() {
  const dispatch = useAppDispatch()
  const { user } = useAppSelector((state) => state.auth)
  const navigation = useNavigation<any>()

  const handleLogout = () => {
    dispatch(logout())
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
})
