import React from 'react'
import { View, StyleSheet, ScrollView } from 'react-native'
import { Text, Card, Button, ProgressBar } from 'react-native-paper'
import { MaterialCommunityIcons } from '@expo/vector-icons'

export default function EducationScreen() {
  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text variant="headlineSmall" style={styles.title}>
          Educação Financeira
        </Text>
      </View>

      <Card style={styles.progressCard}>
        <Card.Content>
          <View style={styles.progressHeader}>
            <MaterialCommunityIcons name="trophy" size={32} color="#f59e0b" />
            <View style={styles.progressInfo}>
              <Text variant="titleLarge" style={styles.levelText}>
                Nível 1
              </Text>
              <Text variant="bodySmall" style={styles.xpText}>
                0 / 100 XP
              </Text>
            </View>
          </View>
          <ProgressBar progress={0} color="#f59e0b" style={styles.progressBar} />
          <View style={styles.stats}>
            <View style={styles.stat}>
              <Text variant="headlineSmall" style={styles.statValue}>
                0
              </Text>
              <Text variant="bodySmall" style={styles.statLabel}>
                Aulas
              </Text>
            </View>
            <View style={styles.stat}>
              <Text variant="headlineSmall" style={styles.statValue}>
                0
              </Text>
              <Text variant="bodySmall" style={styles.statLabel}>
                Sequência
              </Text>
            </View>
            <View style={styles.stat}>
              <Text variant="headlineSmall" style={styles.statValue}>
                0
              </Text>
              <Text variant="bodySmall" style={styles.statLabel}>
                Certificados
              </Text>
            </View>
          </View>
        </Card.Content>
      </Card>

      <View style={styles.section}>
        <Text variant="titleMedium" style={styles.sectionTitle}>
          Meus Cursos
        </Text>
        <Card style={styles.card}>
          <Card.Content>
            <Text variant="bodyMedium" style={styles.emptyText}>
              Nenhum curso iniciado ainda
            </Text>
            <Button
              mode="contained"
              onPress={() => {}}
              style={styles.button}
            >
              Explorar Cursos
            </Button>
          </Card.Content>
        </Card>
      </View>

      <View style={styles.section}>
        <Text variant="titleMedium" style={styles.sectionTitle}>
          Aulas Recentes
        </Text>
        <Card style={styles.card}>
          <Card.Content>
            <Text variant="bodyMedium" style={styles.emptyText}>
              Nenhuma aula visualizada ainda
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
    padding: 16,
    backgroundColor: '#fff',
  },
  title: {
    fontWeight: 'bold',
  },
  progressCard: {
    margin: 16,
    elevation: 2,
  },
  progressHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  progressInfo: {
    marginLeft: 12,
    flex: 1,
  },
  levelText: {
    fontWeight: 'bold',
  },
  xpText: {
    color: '#666',
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
    marginBottom: 16,
  },
  stats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  stat: {
    alignItems: 'center',
  },
  statValue: {
    fontWeight: 'bold',
    color: '#6366f1',
  },
  statLabel: {
    color: '#666',
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
})
