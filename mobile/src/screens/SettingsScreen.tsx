import React, { useState } from 'react'
import { View, StyleSheet, ScrollView, Switch, Alert } from 'react-native'
import { Text, Card, List, Divider } from 'react-native-paper'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useAppSelector } from '../hooks/redux'
import { Linking } from 'react-native'

export default function SettingsScreen() {
  const { user } = useAppSelector((state) => state.auth)
  const [notificationsEnabled, setNotificationsEnabled] = useState(true)
  const [biometricEnabled, setBiometricEnabled] = useState(false)
  const [darkMode, setDarkMode] = useState(false)

  const handleClearCache = () => {
    Alert.alert(
      'Limpar Cache',
      'Tem certeza que deseja limpar o cache? Isso pode melhorar o desempenho do app.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Limpar',
          onPress: () => {
            Alert.alert('Sucesso', 'Cache limpo com sucesso!')
          },
        },
      ]
    )
  }

  const handleExportData = () => {
    Alert.alert('Exportar Dados', 'Os seus dados serão exportados em breve.')
  }

  const handlePrivacyPolicy = () => {
    Linking.openURL('https://www.rubianejoaquim.com/legal')
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView style={styles.container}>
        {/* Account Section */}
        <Card style={styles.card}>
          <Card.Content>
            <Text variant="titleMedium" style={styles.sectionTitle}>Conta</Text>
            <List.Item
              title="Email"
              description={user?.email}
              left={(props) => <List.Icon {...props} icon="email" color="#6366f1" />}
            />
            <Divider />
            <List.Item
              title="Nome"
              description={`${user?.first_name || ''} ${user?.last_name || ''}`}
              left={(props) => <List.Icon {...props} icon="account" color="#6366f1" />}
            />
          </Card.Content>
        </Card>

        {/* Preferences Section */}
        <Card style={styles.card}>
          <Card.Content>
            <Text variant="titleMedium" style={styles.sectionTitle}>Preferências</Text>
            <List.Item
              title="Notificações"
              description="Receber notificações sobre tarefas e atualizações"
              left={(props) => <List.Icon {...props} icon="bell" color="#6366f1" />}
              right={() => (
                <Switch
                  value={notificationsEnabled}
                  onValueChange={setNotificationsEnabled}
                  color="#6366f1"
                />
              )}
            />
            <Divider />
            <List.Item
              title="Autenticação Biométrica"
              description="Usar impressão digital ou Face ID para login"
              left={(props) => <List.Icon {...props} icon="fingerprint" color="#6366f1" />}
              right={() => (
                <Switch
                  value={biometricEnabled}
                  onValueChange={setBiometricEnabled}
                  color="#6366f1"
                />
              )}
            />
            <Divider />
            <List.Item
              title="Modo Escuro"
              description="Ativar tema escuro (em breve)"
              left={(props) => <List.Icon {...props} icon="theme-light-dark" color="#6366f1" />}
              right={() => (
                <Switch
                  value={darkMode}
                  onValueChange={setDarkMode}
                  color="#6366f1"
                  disabled
                />
              )}
            />
          </Card.Content>
        </Card>

        {/* Data Section */}
        <Card style={styles.card}>
          <Card.Content>
            <Text variant="titleMedium" style={styles.sectionTitle}>Dados</Text>
            <List.Item
              title="Exportar Dados"
              description="Fazer download dos seus dados"
              left={(props) => <List.Icon {...props} icon="download" color="#10b981" />}
              onPress={handleExportData}
            />
            <Divider />
            <List.Item
              title="Limpar Cache"
              description="Liberar espaço de armazenamento"
              left={(props) => <List.Icon {...props} icon="delete-sweep" color="#f59e0b" />}
              onPress={handleClearCache}
            />
          </Card.Content>
        </Card>

        {/* Legal Section */}
        <Card style={styles.card}>
          <Card.Content>
            <Text variant="titleMedium" style={styles.sectionTitle}>Legal</Text>
            <List.Item
              title="Política de Privacidade"
              description="Como protegemos os seus dados"
              left={(props) => <List.Icon {...props} icon="shield-lock" color="#8b5cf6" />}
              onPress={handlePrivacyPolicy}
              right={(props) => <List.Icon {...props} icon="chevron-right" />}
            />
            <Divider />
            <List.Item
              title="Termos de Uso"
              description="Termos e condições do serviço"
              left={(props) => <List.Icon {...props} icon="file-document" color="#8b5cf6" />}
              onPress={() => Linking.openURL('https://www.rubianejoaquim.com/legal')}
              right={(props) => <List.Icon {...props} icon="chevron-right" />}
            />
          </Card.Content>
        </Card>

        {/* App Info */}
        <View style={styles.appInfo}>
          <Text variant="bodySmall" style={styles.appVersion}>Versão 1.0.0</Text>
          <Text variant="bodySmall" style={styles.appCopyright}>
            © 2026 Rubiane Joaquim Educação Financeira
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
    marginBottom: 12,
    letterSpacing: -0.3,
  },
  appInfo: {
    alignItems: 'center',
    padding: 24,
    marginBottom: 16,
  },
  appVersion: {
    color: '#6b7280',
    marginBottom: 4,
  },
  appCopyright: {
    color: '#9ca3af',
    fontSize: 12,
  },
})
