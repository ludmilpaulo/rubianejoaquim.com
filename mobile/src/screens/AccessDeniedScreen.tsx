import React from 'react'
import { View, StyleSheet } from 'react-native'
import { Text, Button, Card } from 'react-native-paper'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { useAppDispatch } from '../hooks/redux'
import { checkPaidAccess } from '../store/authSlice'

export default function AccessDeniedScreen() {
  const dispatch = useAppDispatch()

  const handleCheckAgain = () => {
    dispatch(checkPaidAccess())
  }

  return (
    <View style={styles.container}>
      <Card style={styles.card}>
        <Card.Content style={styles.content}>
          <MaterialCommunityIcons
            name="lock-outline"
            size={64}
            color="#d32f2f"
            style={styles.icon}
          />
          <Text variant="headlineSmall" style={styles.title}>
            Acesso Restrito
          </Text>
          <Text variant="bodyMedium" style={styles.message}>
            Este app está disponível apenas para utilizadores que têm acesso pago a cursos ou mentoria.
          </Text>
          <Text variant="bodySmall" style={styles.submessage}>
            Por favor, inscreva-se num curso ou solicite uma mentoria através do site.
          </Text>
          <Button
            mode="outlined"
            onPress={handleCheckAgain}
            style={styles.button}
          >
            Verificar Novamente
          </Button>
        </Card.Content>
      </Card>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    padding: 20,
  },
  card: {
    width: '100%',
    maxWidth: 400,
    elevation: 4,
  },
  content: {
    alignItems: 'center',
    padding: 24,
  },
  icon: {
    marginBottom: 16,
  },
  title: {
    marginBottom: 16,
    textAlign: 'center',
    fontWeight: 'bold',
  },
  message: {
    marginBottom: 12,
    textAlign: 'center',
    color: '#666',
  },
  submessage: {
    marginBottom: 24,
    textAlign: 'center',
    color: '#999',
  },
  button: {
    marginTop: 8,
  },
})
