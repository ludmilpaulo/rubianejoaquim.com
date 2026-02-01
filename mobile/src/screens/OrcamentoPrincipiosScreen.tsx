/**
 * "Tirar dinheiro do orçamento" – 7 real-world scenarios + the real rule.
 * Professional, scrollable content for Finanças Pessoais.
 */
import React from 'react'
import { View, StyleSheet, ScrollView } from 'react-native'
import { Text, Card } from 'react-native-paper'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { SafeAreaView } from 'react-native-safe-area-context'

const SECTIONS = [
  {
    id: '1',
    icon: 'cog' as const,
    color: '#6366f1',
    title: 'Custos operacionais',
    subtitle: 'Manter tudo a funcionar',
    points: [
      'Salários (desenvolvedores, designers, equipa)',
      'Hosting (VPS, AWS, Vercel, domínios)',
      'Ferramentas (Figma, Canva, GitHub, email, contabilidade)',
      'Internet, telefone, eletricidade',
    ],
    note: 'Não é lucro — é custo de sobrevivência.',
  },
  {
    id: '2',
    icon: 'briefcase-check' as const,
    color: '#10b981',
    title: 'Execução de projetos',
    subtitle: 'Trabalho para clientes',
    points: [
      'Cliente paga 50.000 Kz. Alocação típica:',
      '25.000 Kz → desenvolvimento',
      '10.000 Kz → design e UI/UX',
      '5.000 Kz → testes e correções',
      '5.000 Kz → gestão do projeto',
      '5.000 Kz → margem da empresa',
    ],
    note: 'Não se “tira” ao acaso. Aloca-se.',
  },
  {
    id: '3',
    icon: 'cash-refund' as const,
    color: '#f59e0b',
    title: 'Reembolsos',
    subtitle: 'Muito importante e mal entendido',
    points: [
      'Transporte para reuniões',
      'Compra de dispositivos de teste',
      'Pagamento a freelancers adiantado',
      'Impressões, anúncios ou promoções pagas',
    ],
    note: 'Não é salário — é reembolso de despesas.',
  },
  {
    id: '4',
    icon: 'shield-alert' as const,
    color: '#ef4444',
    title: 'Emergência e contingência',
    subtitle: 'Cada orçamento sério tem uma reserva (5–15%)',
    points: [
      'Queda de servidor',
      'Alteração de âmbito pelo cliente',
      'Bug urgente antes do lançamento',
      'Perdas com câmbio (muito comum em África)',
    ],
    note: 'Usar contingência é normal, se documentado.',
  },
  {
    id: '5',
    icon: 'account-tie' as const,
    color: '#8b5cf6',
    title: 'Remuneração do fundador',
    subtitle: 'Onde costumam surgir os problemas',
    points: [
      'Forma correta: salário mensal definido, pago do orçamento aprovado.',
      'Forma errada: “deixem-me tirar um pouco”, misturar pessoal e empresa, sem registos.',
    ],
    note: 'Isto destrói confiança rápido (especialmente com sócios).',
  },
  {
    id: '6',
    icon: 'trending-up' as const,
    color: '#06b6d4',
    title: 'Crescimento e reinvestimento',
    subtitle: 'Dinheiro para crescer, não consumir',
    points: [
      'Campanhas de marketing',
      'Contratação de nova equipa',
      'Desenvolvimento de novo produto',
      'Expansão para outro país',
    ],
    note: 'Empresas inteligentes reinvestem antes de tirar lucro.',
  },
  {
    id: '7',
    icon: 'hand-coin' as const,
    color: '#22c55e',
    title: 'Distribuição de lucro',
    subtitle: 'Só depois de tudo o acima',
    points: [
      'Só quando: custos cobertos, impostos considerados, fluxo de caixa saudável.',
      'Depois: dividendos, pagamentos a sócios, bónus do fundador.',
    ],
    note: 'Se não há lucro, não há nada a tirar.',
  },
]

export default function OrcamentoPrincipiosScreen() {
  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.hero}>
          <View style={styles.heroIconWrap}>
            <MaterialCommunityIcons name="wallet-outline" size={40} color="#6366f1" />
          </View>
          <Text variant="headlineMedium" style={styles.heroTitle}>
            Tirar dinheiro do orçamento
          </Text>
          <Text variant="bodyMedium" style={styles.heroSubtitle}>
            Cenários reais onde o dinheiro sai do orçamento — prático, sem teoria.
          </Text>
        </View>

        {SECTIONS.map((section) => (
          <Card key={section.id} style={styles.card} mode="elevated">
            <Card.Content style={styles.cardContent}>
              <View style={[styles.iconWrap, { backgroundColor: section.color + '20' }]}>
                <MaterialCommunityIcons name={section.icon} size={28} color={section.color} />
              </View>
              <Text variant="titleMedium" style={styles.sectionTitle}>
                {section.title}
              </Text>
              <Text variant="bodySmall" style={styles.sectionSubtitle}>
                {section.subtitle}
              </Text>
              <View style={styles.pointsWrap}>
                {section.points.map((point, i) => (
                  <View key={i} style={styles.pointRow}>
                    <MaterialCommunityIcons name="circle-small" size={20} color={section.color} />
                    <Text variant="bodyMedium" style={styles.pointText}>
                      {point}
                    </Text>
                  </View>
                ))}
              </View>
              <View style={[styles.noteWrap, { borderLeftColor: section.color }]}>
                <Text variant="bodySmall" style={styles.noteText}>
                  {section.note}
                </Text>
              </View>
            </Card.Content>
          </Card>
        ))}

        <Card style={[styles.card, styles.ruleCard]}>
          <Card.Content>
            <View style={styles.ruleIconWrap}>
              <MaterialCommunityIcons name="alert-circle" size={36} color="#b91c1c" />
            </View>
            <Text variant="titleLarge" style={styles.ruleTitle}>
              A regra real
            </Text>
            <Text variant="bodyLarge" style={styles.ruleQuote}>
              Nunca “tiras” dinheiro. Alocas, aprovas e justificas.
            </Text>
            <Text variant="bodyMedium" style={styles.ruleBody}>
              Se o dinheiro sai do orçamento, tem de ser uma destas categorias:
            </Text>
            <View style={styles.ruleTags}>
              {['Despesa', 'Salário', 'Reembolso', 'Investimento', 'Lucro'].map((label) => (
                <View key={label} style={styles.tag}>
                  <Text variant="labelMedium" style={styles.tagText}>
                    {label}
                  </Text>
                </View>
              ))}
            </View>
            <Text variant="bodySmall" style={styles.ruleWarning}>
              Qualquer outra coisa = 🚨 sinal de alerta.
            </Text>
          </Card.Content>
        </Card>

        <View style={styles.bottomPad} />
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  hero: {
    alignItems: 'center',
    marginBottom: 24,
    paddingHorizontal: 8,
  },
  heroIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#eef2ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  heroTitle: {
    fontWeight: '700',
    color: '#1f2937',
    textAlign: 'center',
    marginBottom: 8,
  },
  heroSubtitle: {
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 22,
  },
  card: {
    marginBottom: 16,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#ffffff',
  },
  cardContent: {
    padding: 20,
  },
  iconWrap: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 4,
  },
  sectionSubtitle: {
    color: '#6b7280',
    marginBottom: 12,
  },
  pointsWrap: {
    marginBottom: 12,
  },
  pointRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  pointText: {
    flex: 1,
    color: '#374151',
    lineHeight: 22,
  },
  noteWrap: {
    borderLeftWidth: 4,
    paddingLeft: 12,
    paddingVertical: 8,
    backgroundColor: '#f9fafb',
    borderRadius: 8,
  },
  noteText: {
    color: '#4b5563',
    fontStyle: 'italic',
  },
  ruleCard: {
    borderWidth: 2,
    borderColor: '#fecaca',
    backgroundColor: '#fef2f2',
  },
  ruleIconWrap: {
    alignSelf: 'center',
    marginBottom: 12,
  },
  ruleTitle: {
    fontWeight: '700',
    color: '#b91c1c',
    textAlign: 'center',
    marginBottom: 8,
  },
  ruleQuote: {
    fontWeight: '600',
    color: '#1f2937',
    textAlign: 'center',
    marginBottom: 16,
    fontStyle: 'italic',
  },
  ruleBody: {
    color: '#4b5563',
    marginBottom: 12,
  },
  ruleTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  tag: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  tagText: {
    color: '#374151',
    fontWeight: '600',
  },
  ruleWarning: {
    color: '#b91c1c',
    textAlign: 'center',
    fontWeight: '600',
  },
  bottomPad: {
    height: 24,
  },
})
