import React, { useState, useEffect } from 'react'
import { View, StyleSheet, KeyboardAvoidingView, Platform, ScrollView, TouchableOpacity, Alert } from 'react-native'
import { TextInput, Button, Text, Card, Checkbox } from 'react-native-paper'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useAppDispatch } from '../hooks/redux'
import { login } from '../store/authSlice'
import {
  isBiometricAvailable,
  getBiometricType,
  authenticateWithBiometric,
  isBiometricEnabled,
  enableBiometric,
  getBiometricCredentials,
  clearBiometricCredentials,
} from '../utils/biometric'

export default function LoginScreen() {
  const dispatch = useAppDispatch()
  const [emailOrUsername, setEmailOrUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [biometricAvailable, setBiometricAvailable] = useState(false)
  const [biometricType, setBiometricType] = useState('')
  const [biometricEnabled, setBiometricEnabled] = useState(false)
  const [enableBiometricOption, setEnableBiometricOption] = useState(false)

  const handleLogin = async () => {
    if (!emailOrUsername || !password) {
      setError('Por favor, preencha todos os campos')
      return
    }

    setLoading(true)
    setError('')

    try {
      await dispatch(login({ emailOrUsername, password })).unwrap()
      
      // If user checked "Enable biometric", save credentials
      if (enableBiometricOption && biometricAvailable) {
        try {
          await enableBiometric(emailOrUsername, password)
          setBiometricEnabled(true)
        } catch (err) {
          console.error('Error enabling biometric:', err)
          // Don't show error to user, login was successful
        }
      }
    } catch (err: any) {
      const errorMessage = err.payload || err.message || 'Erro ao fazer login. Verifique suas credenciais.'
      setError(errorMessage)
      console.error('Login error:', err) // Debug log
    } finally {
      setLoading(false)
    }
  }

  const handleBiometricLogin = async () => {
    if (!biometricEnabled) {
      Alert.alert(
        'Biometria não habilitada',
        'Por favor, faça login normalmente e marque a opção para habilitar biometria.'
      )
      return
    }

    const authenticated = await authenticateWithBiometric()
    if (!authenticated) {
      return
    }

    const credentials = await getBiometricCredentials()
    if (!credentials) {
      Alert.alert('Erro', 'Credenciais biométricas não encontradas. Faça login normalmente.')
      return
    }

    setLoading(true)
    setError('')

    try {
      await dispatch(login(credentials)).unwrap()
    } catch (err: any) {
      const errorMessage = err.payload || err.message || 'Erro ao fazer login. Verifique suas credenciais.'
      setError(errorMessage)
      
      // If credentials are invalid, clear biometric data
      if (err.response?.status === 401 || err.response?.status === 400) {
        await clearBiometricCredentials()
        setBiometricEnabled(false)
        Alert.alert(
          'Credenciais inválidas',
          'As credenciais biométricas não são mais válidas. Por favor, faça login novamente.'
        )
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
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

            <View style={styles.passwordContainer}>
              <TextInput
                label="Password"
                value={password}
                onChangeText={setPassword}
                mode="outlined"
                secureTextEntry={!showPassword}
                style={styles.passwordInput}
                right={
                  <TextInput.Icon
                    icon={showPassword ? 'eye-off' : 'eye'}
                    onPress={() => setShowPassword(!showPassword)}
                  />
                }
              />
            </View>

            {biometricAvailable && biometricEnabled && (
              <Button
                mode="outlined"
                onPress={handleBiometricLogin}
                loading={loading}
                disabled={loading}
                style={styles.biometricButton}
                icon={() => (
                  <MaterialCommunityIcons
                    name={biometricType === 'Face ID' ? 'face-recognition' : 'fingerprint'}
                    size={24}
                    color="#6366f1"
                  />
                )}
              >
                Entrar com {biometricType}
              </Button>
            )}

            <View style={styles.divider}>
              {biometricAvailable && biometricEnabled && (
                <>
                  <View style={styles.dividerLine} />
                  <Text style={styles.dividerText}>ou</Text>
                  <View style={styles.dividerLine} />
                </>
              )}
            </View>

            <Button
              mode="contained"
              onPress={handleLogin}
              loading={loading}
              disabled={loading}
              style={styles.button}
            >
              Entrar
            </Button>

            {biometricAvailable && (
              <TouchableOpacity
                style={styles.biometricOption}
                onPress={() => setEnableBiometricOption(!enableBiometricOption)}
                disabled={loading}
              >
                <Checkbox
                  status={enableBiometricOption ? 'checked' : 'unchecked'}
                  onPress={() => setEnableBiometricOption(!enableBiometricOption)}
                  color="#6366f1"
                />
                <Text style={styles.biometricOptionText}>
                  Habilitar login com {biometricType}
                </Text>
              </TouchableOpacity>
            )}

            <Text style={styles.note}>
              Apenas utilizadores com acesso pago podem usar o app.
            </Text>
          </Card.Content>
        </Card>
      </ScrollView>
    </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
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
  passwordContainer: {
    marginBottom: 16,
  },
  passwordInput: {
    flex: 1,
  },
  button: {
    marginTop: 8,
    paddingVertical: 4,
  },
  biometricButton: {
    marginBottom: 16,
    paddingVertical: 4,
    borderColor: '#6366f1',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 16,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#e0e0e0',
  },
  dividerText: {
    marginHorizontal: 16,
    color: '#999',
    fontSize: 14,
  },
  biometricOption: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    paddingVertical: 8,
  },
  biometricOptionText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#666',
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
