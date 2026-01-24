import React from 'react'
import { View, StyleSheet, ScrollView } from 'react-native'
import { Text, Card, Button, FAB } from 'react-native-paper'
import { MaterialCommunityIcons } from '@expo/vector-icons'

export default function PersonalFinanceScreen() {
  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView}>
        <View style={styles.header}>
          <Text variant="headlineSmall" style={styles.title}>
            Finanças Pessoais
          </Text>
        </View>

        <Card style={styles.summaryCard}>
          <Card.Content>
            <Text variant="bodySmall" style={styles.summaryLabel}>
              Saldo Disponível
            </Text>
            <Text variant="headlineLarge" style={styles.summaryAmount}>
              AOA 0,00
            </Text>
          </Card.Content>
        </Card>

        <View style={styles.section}>
          <Text variant="titleMedium" style={styles.sectionTitle}>
            Despesas do Mês
          </Text>
          <Card style={styles.card}>
            <Card.Content>
              <Text variant="bodyMedium" style={styles.emptyText}>
                Nenhuma despesa registada ainda
              </Text>
              <Button
                mode="contained"
                onPress={() => {}}
                style={styles.button}
              >
                Adicionar Despesa
              </Button>
            </Card.Content>
          </Card>
        </View>

        <View style={styles.section}>
          <Text variant="titleMedium" style={styles.sectionTitle}>
            Orçamentos
          </Text>
          <Card style={styles.card}>
            <Card.Content>
              <Text variant="bodyMedium" style={styles.emptyText}>
                Nenhum orçamento criado ainda
              </Text>
              <Button
                mode="outlined"
                onPress={() => {}}
                style={styles.button}
              >
                Criar Orçamento
              </Button>
            </Card.Content>
          </Card>
        </View>

        <View style={styles.section}>
          <Text variant="titleMedium" style={styles.sectionTitle}>
            Objetivos
          </Text>
          <Card style={styles.card}>
            <Card.Content>
              <Text variant="bodyMedium" style={styles.emptyText}>
                Nenhum objetivo definido ainda
              </Text>
              <Button
                mode="outlined"
                onPress={() => {}}
                style={styles.button}
              >
                Criar Objetivo
              </Button>
            </Card.Content>
          </Card>
        </View>
      </ScrollView>

      <FAB
        icon="plus"
        style={styles.fab}
        onPress={() => {}}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollView: {
    flex: 1,
  },
  header: {
    padding: 16,
    backgroundColor: '#fff',
  },
  title: {
    fontWeight: 'bold',
  },
  summaryCard: {
    margin: 16,
    backgroundColor: '#6366f1',
  },
  summaryLabel: {
    color: '#fff',
    opacity: 0.9,
  },
  summaryAmount: {
    color: '#fff',
    fontWeight: 'bold',
    marginTop: 4,
  },
  section: {
    marginBottom: 16,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontWeight: 'bold',
    marginBottom: 8,
  },
  card: {
    elevation: 2,
  },
  emptyText: {
    textAlign: 'center',
    color: '#999',
    marginBottom: 16,
  },
  button: {
    marginTop: 8,
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
    backgroundColor: '#6366f1',
  },
})
