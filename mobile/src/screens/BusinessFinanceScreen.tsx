import React from 'react'
import { View, StyleSheet, ScrollView } from 'react-native'
import { Text, Card, Button, FAB } from 'react-native-paper'

export default function BusinessFinanceScreen() {
  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView}>
        <View style={styles.header}>
          <Text variant="headlineSmall" style={styles.title}>
            Finanças do Negócio
          </Text>
        </View>

        <Card style={styles.metricsCard}>
          <Card.Content>
            <View style={styles.metricRow}>
              <View style={styles.metric}>
                <Text variant="bodySmall" style={styles.metricLabel}>
                  Vendas
                </Text>
                <Text variant="headlineSmall" style={styles.metricValue}>
                  AOA 0,00
                </Text>
              </View>
              <View style={styles.metric}>
                <Text variant="bodySmall" style={styles.metricLabel}>
                  Despesas
                </Text>
                <Text variant="headlineSmall" style={styles.metricValue}>
                  AOA 0,00
                </Text>
              </View>
            </View>
            <View style={styles.profitContainer}>
              <Text variant="bodySmall" style={styles.profitLabel}>
                Lucro
              </Text>
              <Text variant="headlineMedium" style={styles.profitValue}>
                AOA 0,00
              </Text>
            </View>
          </Card.Content>
        </Card>

        <View style={styles.section}>
          <Text variant="titleMedium" style={styles.sectionTitle}>
            Vendas Recentes
          </Text>
          <Card style={styles.card}>
            <Card.Content>
              <Text variant="bodyMedium" style={styles.emptyText}>
                Nenhuma venda registada ainda
              </Text>
              <Button
                mode="contained"
                onPress={() => {}}
                style={styles.button}
              >
                Registrar Venda
              </Button>
            </Card.Content>
          </Card>
        </View>

        <View style={styles.section}>
          <Text variant="titleMedium" style={styles.sectionTitle}>
            Despesas do Negócio
          </Text>
          <Card style={styles.card}>
            <Card.Content>
              <Text variant="bodyMedium" style={styles.emptyText}>
                Nenhuma despesa registada ainda
              </Text>
              <Button
                mode="outlined"
                onPress={() => {}}
                style={styles.button}
              >
                Adicionar Despesa
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
  metricsCard: {
    margin: 16,
    elevation: 2,
  },
  metricRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
  },
  metric: {
    alignItems: 'center',
  },
  metricLabel: {
    color: '#666',
    marginBottom: 4,
  },
  metricValue: {
    fontWeight: 'bold',
    color: '#6366f1',
  },
  profitContainer: {
    alignItems: 'center',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  profitLabel: {
    color: '#666',
    marginBottom: 4,
  },
  profitValue: {
    fontWeight: 'bold',
    color: '#10b981',
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
    backgroundColor: '#10b981',
  },
})
