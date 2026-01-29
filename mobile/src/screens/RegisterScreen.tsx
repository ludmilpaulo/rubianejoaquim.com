import React, { useState } from 'react'
import { View, StyleSheet, KeyboardAvoidingView, Platform, ScrollView, TouchableOpacity, Alert } from 'react-native'
import { TextInput, Button, Text, Card } from 'react-native-paper'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useAppDispatch } from '../hooks/redux'
import { register } from '../store/authSlice'
import { checkPaidAccess } from '../store/authSlice'
import type { StackScreenProps } from '@react-navigation/stack'
import type { AuthStackParamList } from '../navigation/AuthNavigator'

type Props = StackScreenProps<AuthStackParamList, 'Register'>

export default function RegisterScreen({ navigation }: Props) {
  const dispatch = useAppDispatch()
  const [email, setEmail] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [passwordConfirm, setPasswordConfirm] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleRegister = async () => {
    setError('')
    if (!email.trim() || !username.trim() || !password || !passwordConfirm || !firstName.trim() || !lastName.trim()) {
      setError('Por favor, preencha todos os campos.')
      return
    }
    if (password.length < 8) {
      setError('A palavra-passe deve ter pelo menos 8 caracteres.')
      return
    }
    if (password !== passwordConfirm) {
      setError('As palavras-passe não coincidem.')
      return
    }

    setLoading(true)
    try {
      await dispatch(
        register({
          email: email.trim(),
          username: username.trim(),
          password,
          password_confirm: passwordConfirm,
          first_name: firstName.trim(),
          last_name: lastName.trim(),
        })
      ).unwrap()
      await dispatch(checkPaidAccess()).unwrap()
      Alert.alert(
        'Conta criada',
        'A sua conta foi criada. Pode começar a semana grátis do app na próxima ecrã ou inscrever-se num curso no site.'
      )
      navigation.replace('AccessDenied')
    } catch (err: any) {
      const msg = err?.payload || err?.message || 'Erro ao criar conta. Tente novamente.'
      setError(typeof msg === 'string' ? msg : JSON.stringify(msg))
      Alert.alert('Erro ao criar conta', typeof msg === 'string' ? msg : 'Verifique os dados e tente novamente.')
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
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          <Card style={styles.card} elevation={8 as 0 | 1 | 2 | 3 | 4 | 5}>
            <Card.Content style={styles.cardContent}>
              <TouchableOpacity
                style={styles.backButton}
                onPress={() => navigation.goBack()}
                disabled={loading}
              >
                <MaterialCommunityIcons name="arrow-left" size={24} color="#6366f1" />
              </TouchableOpacity>
              <View style={styles.logoContainer}>
                <View style={styles.logoCircle}>
                  <MaterialCommunityIcons name="account-plus" size={40} color="#6366f1" />
                </View>
              </View>
              <Text variant="headlineMedium" style={styles.title}>
                Criar conta
              </Text>
              <Text variant="bodyMedium" style={styles.subtitle}>
                Registe-se no Zenda para ter 1 semana grátis e depois 10.000 Kz/mês.
              </Text>

              {error ? (
                <View style={styles.errorContainer}>
                  <MaterialCommunityIcons name="alert-circle" size={20} color="#d32f2f" />
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              ) : null}

              <TextInput
                label="Nome"
                value={firstName}
                onChangeText={setFirstName}
                mode="outlined"
                style={styles.input}
                autoCapitalize="words"
              />
              <TextInput
                label="Apelido"
                value={lastName}
                onChangeText={setLastName}
                mode="outlined"
                style={styles.input}
                autoCapitalize="words"
              />
              <TextInput
                label="Email"
                value={email}
                onChangeText={setEmail}
                mode="outlined"
                style={styles.input}
                keyboardType="email-address"
                autoCapitalize="none"
              />
              <TextInput
                label="Username"
                value={username}
                onChangeText={setUsername}
                mode="outlined"
                style={styles.input}
                autoCapitalize="none"
              />
              <TextInput
                label="Palavra-passe"
                value={password}
                onChangeText={setPassword}
                mode="outlined"
                secureTextEntry={!showPassword}
                style={styles.input}
                right={
                  <TextInput.Icon
                    icon={showPassword ? 'eye-off' : 'eye'}
                    onPress={() => setShowPassword(!showPassword)}
                  />
                }
              />
              <TextInput
                label="Confirmar palavra-passe"
                value={passwordConfirm}
                onChangeText={setPasswordConfirm}
                mode="outlined"
                secureTextEntry={!showPassword}
                style={styles.input}
              />

              <Button
                mode="contained"
                onPress={handleRegister}
                loading={loading}
                disabled={loading}
                style={styles.button}
                buttonColor="#6366f1"
                contentStyle={styles.buttonContent}
                labelStyle={styles.buttonLabel}
              >
                Registar
              </Button>

              <TouchableOpacity
                style={styles.loginLink}
                onPress={() => navigation.navigate('Login')}
                disabled={loading}
              >
                <Text style={styles.loginLinkText}>Já tem conta? </Text>
                <Text style={styles.loginLinkBold}>Entrar</Text>
              </TouchableOpacity>
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
    padding: 20,
    paddingVertical: 24,
    zIndex: 1,
  },
  card: {
    borderRadius: 24,
    backgroundColor: '#ffffff',
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 8,
  },
  cardContent: {
    padding: 24,
  },
  backButton: {
    position: 'absolute',
    top: 16,
    left: 16,
    zIndex: 1,
    padding: 4,
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
    marginBottom: 24,
    color: '#6b7280',
    lineHeight: 20,
  },
  input: {
    marginBottom: 14,
  },
  button: {
    marginTop: 8,
    marginBottom: 16,
  },
  buttonContent: {
    paddingVertical: 4,
  },
  buttonLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 14,
    borderRadius: 12,
    marginBottom: 16,
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fca5a5',
  },
  errorText: {
    flex: 1,
    fontSize: 14,
    color: '#d32f2f',
  },
  loginLink: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 8,
  },
  loginLinkText: {
    fontSize: 14,
    color: '#6b7280',
  },
  loginLinkBold: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6366f1',
  },
})
