import React from 'react'
import { View, StyleSheet, ScrollView } from 'react-native'
import { Text, Card, Button, List } from 'react-native-paper'
import { useAppDispatch, useAppSelector } from '../hooks/redux'
import { logout } from '../store/authSlice'

export default function ProfileScreen() {
  const dispatch = useAppDispatch()
  const { user } = useAppSelector((state) => state.auth)

  const handleLogout = () => {
    dispatch(logout())
  }

  return (
    <ScrollView style={styles.container}>
      <Card style={styles.profileCard}>
        <Card.Content>
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
            </View>
          </View>
        </Card.Content>
      </Card>

      <Card style={styles.card}>
        <Card.Content>
          <List.Item
            title="Configurações"
            left={(props) => <List.Icon {...props} icon="cog" />}
            onPress={() => {}}
          />
          <List.Item
            title="Sobre o Zenda"
            left={(props) => <List.Icon {...props} icon="information" />}
            onPress={() => {}}
          />
          <List.Item
            title="Ajuda e Suporte"
            left={(props) => <List.Icon {...props} icon="help-circle" />}
            onPress={() => {}}
          />
        </Card.Content>
      </Card>

      <View style={styles.logoutContainer}>
        <Button
          mode="contained"
          onPress={handleLogout}
          buttonColor="#d32f2f"
          style={styles.logoutButton}
        >
          Sair
        </Button>
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  profileCard: {
    margin: 16,
    elevation: 2,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#6366f1',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
  },
  profileInfo: {
    marginLeft: 16,
    flex: 1,
  },
  name: {
    fontWeight: 'bold',
    marginBottom: 4,
  },
  email: {
    color: '#666',
  },
  card: {
    margin: 16,
    marginTop: 0,
    elevation: 2,
  },
  logoutContainer: {
    padding: 16,
  },
  logoutButton: {
    paddingVertical: 4,
  },
})
