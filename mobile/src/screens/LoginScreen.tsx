import React, { useState } from 'react'
import { View, StyleSheet, KeyboardAvoidingView, Platform, ScrollView } from 'react-native'
import { TextInput, Button, Text, Card } from 'react-native-paper'
import { useAppDispatch } from '../hooks/redux'
import { login } from '../store/authSlice'

export default function LoginScreen() {
  const dispatch = useAppDispatch()
  const [emailOrUsername, setEmailOrUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleLogin = async () => {
    if (!emailOrUsername || !password) {
      setError('Por favor, preencha todos os campos')
      return
    }

    setLoading(true)
    setError('')

    try {
      await dispatch(login({ emailOrUsername, password })).unwrap()
    } catch (err: any) {
      const errorMessage = err.payload || err.message || 'Erro ao fazer login. Verifique suas credenciais.'
      setError(errorMessage)
      console.error('Login error:', err) // Debug log
    } finally {
      setLoading(false)
    }
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Card style={styles.card}>
          <Card.Content>
            <Text variant="headlineMedium" style={styles.title}>
              Zenda
            </Text>
            <Text variant="bodyMedium" style={styles.subtitle}>
              One app. Your money. Your life. Your business.
            </Text>

            {error ? (
              <Text style={styles.error}>{error}</Text>
            ) : null}

            <TextInput
              label="Email ou Username"
              value={emailOrUsername}
              onChangeText={setEmailOrUsername}
              mode="outlined"
              style={styles.input}
              autoCapitalize="none"
              keyboardType="email-address"
            />

            <TextInput
              label="Password"
              value={password}
              onChangeText={setPassword}
              mode="outlined"
              secureTextEntry
              style={styles.input}
            />

            <Button
              mode="contained"
              onPress={handleLogin}
              loading={loading}
              disabled={loading}
              style={styles.button}
            >
              Entrar
            </Button>

            <Text style={styles.note}>
              Apenas utilizadores com acesso pago podem usar o app.
            </Text>
          </Card.Content>
        </Card>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
  },
  card: {
    elevation: 4,
  },
  title: {
    textAlign: 'center',
    marginBottom: 8,
    fontWeight: 'bold',
    color: '#6366f1',
  },
  subtitle: {
    textAlign: 'center',
    marginBottom: 24,
    color: '#666',
  },
  input: {
    marginBottom: 16,
  },
  button: {
    marginTop: 8,
    paddingVertical: 4,
  },
  error: {
    color: '#d32f2f',
    marginBottom: 16,
    textAlign: 'center',
  },
  note: {
    marginTop: 16,
    textAlign: 'center',
    fontSize: 12,
    color: '#999',
  },
})
