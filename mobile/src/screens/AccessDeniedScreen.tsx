import React from 'react'
import { View, StyleSheet, Linking, Alert } from 'react-native'
import { Text, Button, Card } from 'react-native-paper'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { useAppDispatch } from '../hooks/redux'
import { checkPaidAccess } from '../store/authSlice'

export default function AccessDeniedScreen() {
  const dispatch = useAppDispatch()

  const handleCheckAgain = () => {
    dispatch(checkPaidAccess())
  }

  const handleOpenCourses = async () => {
    const url = 'https://www.rubianejoaquim.com/cursos'
    try {
      const supported = await Linking.canOpenURL(url)
      if (supported) {
        await Linking.openURL(url)
      } else {
        Alert.alert('Erro', 'Não foi possível abrir o link.')
      }
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível abrir o link.')
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.backgroundDecor}>
        <View style={styles.circle1} />
        <View style={styles.circle2} />
      </View>
      <Card style={styles.card}>
        <Card.Content style={styles.content}>
          <View style={styles.iconContainer}>
            <View style={styles.iconBackground}>
              <MaterialCommunityIcons
                name="lock-outline"
                size={56}
                color="#6366f1"
              />
            </View>
          </View>
          <Text variant="headlineMedium" style={styles.title}>
            Acesso Restrito
          </Text>
          <Text variant="bodyLarge" style={styles.message}>
            Este app está disponível apenas para utilizadores que têm acesso pago a cursos ou mentoria.
          </Text>
          <Text variant="bodyMedium" style={styles.submessage}>
            Por favor, inscreva-se num curso ou solicite uma mentoria através do site.
          </Text>
          <View style={styles.buttonContainer}>
            <Button
              mode="contained"
              onPress={handleOpenCourses}
              style={styles.primaryButton}
              buttonColor="#6366f1"
              contentStyle={styles.buttonContent}
              labelStyle={styles.buttonLabel}
              icon={() => <MaterialCommunityIcons name="book-open-variant" size={22} color="#fff" />}
            >
              Ver Cursos e Inscrever-se
            </Button>
            <Button
              mode="outlined"
              onPress={handleCheckAgain}
              style={styles.secondaryButton}
              contentStyle={styles.buttonContent}
              labelStyle={styles.secondaryButtonLabel}
              icon={() => <MaterialCommunityIcons name="refresh" size={20} color="#6366f1" />}
            >
              Verificar Novamente
            </Button>
          </View>
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
    backgroundColor: '#f8fafc',
    padding: 20,
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
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: '#6366f1',
    opacity: 0.05,
    top: -100,
    right: -100,
  },
  circle2: {
    position: 'absolute',
    width: 250,
    height: 250,
    borderRadius: 125,
    backgroundColor: '#8b5cf6',
    opacity: 0.05,
    bottom: -80,
    left: -80,
  },
  card: {
    width: '100%',
    maxWidth: 420,
    borderRadius: 24,
    backgroundColor: '#ffffff',
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 8,
    zIndex: 1,
  },
  content: {
    alignItems: 'center',
    padding: 32,
  },
  iconContainer: {
    marginBottom: 24,
  },
  iconBackground: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#f0f4ff',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#e0e7ff',
  },
  title: {
    marginBottom: 16,
    textAlign: 'center',
    fontWeight: '700',
    color: '#1f2937',
    letterSpacing: -0.5,
  },
  message: {
    marginBottom: 12,
    textAlign: 'center',
    color: '#4b5563',
    lineHeight: 24,
  },
  submessage: {
    marginBottom: 32,
    textAlign: 'center',
    color: '#6b7280',
    lineHeight: 20,
  },
  buttonContainer: {
    width: '100%',
    gap: 12,
  },
  primaryButton: {
    borderRadius: 12,
    elevation: 3,
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  secondaryButton: {
    borderRadius: 12,
    borderColor: '#6366f1',
    borderWidth: 1.5,
    marginTop: 12,
  },
  buttonContent: {
    paddingVertical: 8,
    height: 52,
  },
  buttonLabel: {
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  secondaryButtonLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#6366f1',
  },
})
