import React from 'react'
import { View, StyleSheet, ScrollView } from 'react-native'
import { Text, Card, Button } from 'react-native-paper'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { useAppSelector } from '../hooks/redux'

export default function HomeScreen() {
  const { user } = useAppSelector((state) => state.auth)

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text variant="headlineMedium" style={styles.greeting}>
          Olá, {user?.first_name || 'Utilizador'}! 👋
        </Text>
        <Text variant="bodyMedium" style={styles.subtitle}>
          Bem-vindo ao Zenda
        </Text>
      </View>

      <View style={styles.cards}>
        <Card style={styles.card} onPress={() => {}}>
          <Card.Content>
            <View style={styles.cardHeader}>
              <MaterialCommunityIcons name="wallet" size={32} color="#6366f1" />
              <Text variant="titleLarge" style={styles.cardTitle}>
                Finanças Pessoais
              </Text>
            </View>
            <Text variant="bodyMedium" style={styles.cardText}>
              Rastreie despesas, orçamentos e objetivos
            </Text>
          </Card.Content>
        </Card>

        <Card style={styles.card} onPress={() => {}}>
          <Card.Content>
            <View style={styles.cardHeader}>
              <MaterialCommunityIcons name="store" size={32} color="#10b981" />
              <Text variant="titleLarge" style={styles.cardTitle}>
                Finanças do Negócio
              </Text>
            </View>
            <Text variant="bodyMedium" style={styles.cardText}>
              Gerencie vendas, despesas e lucros
            </Text>
          </Card.Content>
        </Card>

        <Card style={styles.card} onPress={() => {}}>
          <Card.Content>
            <View style={styles.cardHeader}>
              <MaterialCommunityIcons name="school" size={32} color="#f59e0b" />
              <Text variant="titleLarge" style={styles.cardTitle}>
                Educação Financeira
              </Text>
            </View>
            <Text variant="bodyMedium" style={styles.cardText}>
              Aulas, progresso e certificados
            </Text>
          </Card.Content>
        </Card>

        <Card style={styles.card} onPress={() => {}}>
          <Card.Content>
            <View style={styles.cardHeader}>
              <MaterialCommunityIcons name="robot" size={32} color="#8b5cf6" />
              <Text variant="titleLarge" style={styles.cardTitle}>
                AI Financial Copilot
              </Text>
            </View>
            <Text variant="bodyMedium" style={styles.cardText}>
              Conselhos personalizados baseados nos seus dados
            </Text>
          </Card.Content>
        </Card>
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  greeting: {
    fontWeight: 'bold',
    marginBottom: 4,
  },
  subtitle: {
    color: '#666',
  },
  cards: {
    padding: 16,
  },
  card: {
    marginBottom: 16,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  cardTitle: {
    marginLeft: 12,
    fontWeight: 'bold',
  },
  cardText: {
    color: '#666',
    marginTop: 4,
  },
})
