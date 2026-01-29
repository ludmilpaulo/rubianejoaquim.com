import React, { useState, useEffect } from 'react'
import { View, StyleSheet, KeyboardAvoidingView, Platform, ScrollView, TouchableOpacity, Alert } from 'react-native'
import { TextInput, Button, Text, Card, Checkbox } from 'react-native-paper'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useAppDispatch } from '../hooks/redux'
import { login } from '../store/authSlice'
import type { StackScreenProps } from '@react-navigation/stack'
import type { AuthStackParamList } from '../navigation/AuthNavigator'

type Props = StackScreenProps<AuthStackParamList, 'Login'>
import {
  isBiometricAvailable,
  getBiometricType,
  authenticateWithBiometric,
  isBiometricEnabled,
  enableBiometric,
  getBiometricCredentials,
  clearBiometricCredentials,
} from '../utils/biometric'

export default function LoginScreen({ navigation }: Props) {
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

  // Initialize biometric availability on mount
  useEffect(() => {
    const checkBiometric = async () => {
      try {
        const available = await isBiometricAvailable()
        setBiometricAvailable(available)
        
        if (available) {
          const type = await getBiometricType()
          setBiometricType(type)
          
          const enabled = await isBiometricEnabled()
          setBiometricEnabled(enabled)
        }
      } catch (error) {
        console.error('Error checking biometric:', error)
      }
    }
    
    checkBiometric()
  }, [])

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
      let errorMessage = 'Erro ao fazer login. Verifique suas credenciais.'
      
      console.error('🔴 Login error object:', JSON.stringify(err, null, 2))
      console.error('🔴 Error type:', typeof err)
      console.error('🔴 Error keys:', Object.keys(err || {}))
      
      // Extract error message from Redux thunk rejection
      // Redux Toolkit thunks reject with the value passed to rejectWithValue
      if (err.payload) {
        errorMessage = typeof err.payload === 'string' ? err.payload : JSON.stringify(err.payload)
        console.log('📦 Error from payload:', err.payload)
      } else if (err.message) {
        errorMessage = err.message
        console.log('📝 Error from message:', err.message)
      } else if (typeof err === 'string') {
        errorMessage = err
        console.log('📄 Error is string:', err)
      } else {
        // Try to extract from error object
        const errorStr = err.toString()
        if (errorStr !== '[object Object]') {
          errorMessage = errorStr
        }
        console.log('🔍 Error string representation:', errorStr)
      }
      
      setError(errorMessage)
      console.error('❌ Final error message:', errorMessage)
      
      // Show specific alerts based on error type
      if (errorMessage.includes('não encontrado') || errorMessage.includes('Utilizador não encontrado')) {
        Alert.alert(
          '❌ Utilizador não encontrado',
          'O utilizador que introduziu não existe.\n\nVerifique o email ou username e tente novamente.',
          [{ text: 'OK', style: 'default' }]
        )
      } else if (errorMessage.includes('incorreta') || errorMessage.includes('Palavra-passe incorreta')) {
        Alert.alert(
          '⚠️ Palavra-passe incorreta',
          'O utilizador existe, mas a palavra-passe está incorreta.\n\nTente novamente.',
          [{ text: 'OK', style: 'default' }]
        )
      } else if (errorMessage.includes('não foi possível conectar') || errorMessage.includes('Network Error') || errorMessage.includes('timeout') || errorMessage.includes('conectar ao servidor')) {
        Alert.alert(
          '🔌 Erro de Conexão',
          errorMessage + '\n\nVerifique:\n• Ligação à internet\n• URL do servidor está correta\n• Servidor está online',
          [{ text: 'OK', style: 'default' }]
        )
      } else {
        // Show generic error alert
        Alert.alert(
          '❌ Erro ao fazer login',
          errorMessage,
          [{ text: 'OK', style: 'default' }]
        )
      }
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
      let errorMessage = 'Erro ao fazer login. Verifique suas credenciais.'
      
      // Extract error message from payload (Redux thunk rejection)
      if (err.payload) {
        errorMessage = err.payload
      } else if (err.message) {
        errorMessage = err.message
      }
      
      setError(errorMessage)
      
      // Show specific alerts based on error type
      if (errorMessage.includes('não encontrado') || errorMessage.includes('Utilizador não encontrado')) {
        Alert.alert(
          '❌ Utilizador não encontrado',
          'O utilizador que introduziu não existe.\n\nVerifique o email ou username e tente novamente.',
          [{ text: 'OK', style: 'default' }]
        )
      } else if (errorMessage.includes('incorreta') || errorMessage.includes('Palavra-passe incorreta')) {
        Alert.alert(
          '⚠️ Palavra-passe incorreta',
          'O utilizador existe, mas a palavra-passe está incorreta.\n\nTente novamente.',
          [{ text: 'OK', style: 'default' }]
        )
      } else {
        // Generic error for biometric login
        Alert.alert(
          'Erro ao fazer login',
          errorMessage
        )
      }
      
      // If credentials are invalid, clear biometric data
      if (err.response?.status === 401 || err.response?.status === 400) {
        await clearBiometricCredentials()
        setBiometricEnabled(false)
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
        <View style={styles.backgroundDecor}>
          <View style={styles.circle1} />
          <View style={styles.circle2} />
        </View>
        <ScrollView contentContainerStyle={styles.scrollContent}>
        <Card style={styles.card} elevation={8 as 0 | 1 | 2 | 3 | 4 | 5}>
          <Card.Content style={styles.cardContent}>
            <View style={styles.logoContainer}>
              <View style={styles.logoCircle}>
                <MaterialCommunityIcons name="wallet" size={40} color="#6366f1" />
              </View>
            </View>
            <Text variant="headlineMedium" style={styles.title}>
              Zenda
            </Text>
            <Text variant="bodyMedium" style={styles.subtitle}>
              One app. Your money. Your life. Your business.
            </Text>

            {error ? (
              <View style={[
                styles.errorContainer,
                error.includes('não encontrado') || error.includes('Utilizador não encontrado')
                  ? styles.errorWarning
                  : error.includes('incorreta') || error.includes('Palavra-passe incorreta')
                  ? styles.errorInfo
                  : styles.errorDanger
              ]}>
                <MaterialCommunityIcons
                  name={
                    error.includes('não encontrado') || error.includes('Utilizador não encontrado')
                      ? 'account-remove'
                      : error.includes('incorreta') || error.includes('Palavra-passe incorreta')
                      ? 'lock-alert'
                      : 'alert-circle'
                  }
                  size={20}
                  color={
                    error.includes('não encontrado') || error.includes('Utilizador não encontrado')
                      ? '#f97316'
                      : error.includes('incorreta') || error.includes('Palavra-passe incorreta')
                      ? '#eab308'
                      : '#d32f2f'
                  }
                />
                <Text style={[
                  styles.error,
                  error.includes('não encontrado') || error.includes('Utilizador não encontrado')
                    ? styles.errorWarningText
                    : error.includes('incorreta') || error.includes('Palavra-passe incorreta')
                    ? styles.errorInfoText
                    : styles.errorDangerText
                ]}>
                  {error}
                </Text>
              </View>
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
              buttonColor="#6366f1"
              contentStyle={styles.buttonContent}
              labelStyle={styles.buttonLabel}
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

            <TouchableOpacity
              style={styles.registerLink}
              onPress={() => navigation.navigate('Register')}
              disabled={loading}
            >
              <Text style={styles.registerLinkText}>Não tem conta? </Text>
              <Text style={styles.registerLinkBold}>Registar</Text>
            </TouchableOpacity>

            <Text style={styles.note}>
              Registe-se para 1 semana grátis ou inscreva-se num curso no site.
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
    backgroundColor: '#f8fafc',
  },
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
    position: 'relative',
  },
  backgroundDecor: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    top: 0,
    left: 0,
  },
  circle1: {
    position: 'absolute',
    width: 250,
    height: 250,
    borderRadius: 125,
    backgroundColor: '#6366f1',
    opacity: 0.06,
    top: -80,
    right: -80,
  },
  circle2: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: '#8b5cf6',
    opacity: 0.06,
    bottom: -60,
    left: -60,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
    zIndex: 1,
  },
  card: {
    borderRadius: 24,
    backgroundColor: '#ffffff',
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 8 as number,
  },
  cardContent: {
    padding: 24,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  logoCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#f0f4ff',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#e0e7ff',
  },
  title: {
    textAlign: 'center',
    marginBottom: 8,
    fontWeight: '700',
    color: '#1f2937',
    letterSpacing: -0.5,
  },
  subtitle: {
    textAlign: 'center',
    marginBottom: 32,
    color: '#6b7280',
    lineHeight: 20,
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
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 14,
    borderRadius: 12,
    marginBottom: 16,
  },
  errorWarning: {
    backgroundColor: '#fff7ed',
    borderWidth: 1,
    borderColor: '#fdba74',
  },
  errorInfo: {
    backgroundColor: '#fefce8',
    borderWidth: 1,
    borderColor: '#fde047',
  },
  errorDanger: {
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fca5a5',
  },
  error: {
    flex: 1,
    fontSize: 14,
    textAlign: 'left',
  },
  errorWarningText: {
    color: '#c2410c',
  },
  errorInfoText: {
    color: '#854d0e',
  },
  errorDangerText: {
    color: '#d32f2f',
  },
  registerLink: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
    paddingVertical: 8,
  },
  registerLinkText: {
    fontSize: 14,
    color: '#6b7280',
  },
  registerLinkBold: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6366f1',
  },
  note: {
    marginTop: 8,
    textAlign: 'center',
    fontSize: 12,
    color: '#999',
  },
})
