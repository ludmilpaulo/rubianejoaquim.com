import React, { useState, useEffect } from 'react'
import { View, StyleSheet, ScrollView, RefreshControl, TouchableOpacity, Dimensions, Alert } from 'react-native'
import { Text, Card, Button, FAB, Chip, Portal, Modal, TextInput, SegmentedButtons, IconButton, Menu } from 'react-native-paper'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { SafeAreaView } from 'react-native-safe-area-context'
import { LineChart, PieChart, BarChart } from 'react-native-chart-kit'
import { businessFinanceApi } from '../services/api'
import { formatCurrency } from '../utils/currency'
import DatePicker from '../components/DatePicker'

const { width } = Dimensions.get('window')

interface Sale {
  id: number
  amount: string
  description: string
  customer_name: string
  date: string
  payment_method: string
  invoice_number: string
}

interface BusinessExpense {
  id: number
  category_name?: string
  category_icon?: string
  category_color?: string
  amount: string
  description: string
  date: string
  payment_method: string
  supplier: string
  is_tax_deductible: boolean
}

interface Category {
  id: number
  name: string
  icon: string
  color: string
}

export default function BusinessFinanceScreen() {
  const [activeTab, setActiveTab] = useState<'overview' | 'sales' | 'expenses'>('overview')
  const [refreshing, setRefreshing] = useState(false)
  const [sales, setSales] = useState<Sale[]>([])
  const [expenses, setExpenses] = useState<BusinessExpense[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [metrics, setMetrics] = useState<any>(null)
  const [salesSummary, setSalesSummary] = useState<any>(null)
  const [expensesSummary, setExpensesSummary] = useState<any>(null)
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1)
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
  
  // Modals
  const [showSaleModal, setShowSaleModal] = useState(false)
  const [showExpenseModal, setShowExpenseModal] = useState(false)
  const [showCategoryModal, setShowCategoryModal] = useState(false)
  const [showCategoryMenu, setShowCategoryMenu] = useState(false)
  const [editingItem, setEditingItem] = useState<any>(null)
  
  // Category form
  const [categoryForm, setCategoryForm] = useState({ name: '', icon: 'tag', color: '#ef4444' })
  
  // Form states
  const [saleForm, setSaleForm] = useState({
    amount: '',
    description: '',
    customer_name: '',
    date: new Date(),
    payment_method: 'cash',
    invoice_number: '',
  })
  const [expenseForm, setExpenseForm] = useState({
    category: '',
    amount: '',
    description: '',
    date: new Date(),
    payment_method: 'cash',
    supplier: '',
    invoice_number: '',
    is_tax_deductible: false,
  })

  useEffect(() => {
    loadData()
  }, [selectedMonth, selectedYear])

  const loadData = async () => {
    try {
      const [salesRes, expensesRes, categoriesRes, metricsRes, salesSummaryRes, expensesSummaryRes] = await Promise.all([
        businessFinanceApi.getSales(selectedMonth, selectedYear),
        businessFinanceApi.getExpenses(selectedMonth, selectedYear),
        businessFinanceApi.getCategories(true),
        businessFinanceApi.getMetrics(),
        businessFinanceApi.getSalesSummary(),
        businessFinanceApi.getExpensesSummary(),
      ])
      
      setSales(Array.isArray(salesRes) ? salesRes : salesRes.results || [])
      setExpenses(Array.isArray(expensesRes) ? expensesRes : expensesRes.results || [])
      setCategories(Array.isArray(categoriesRes) ? categoriesRes : categoriesRes.results || [])
      setMetrics(metricsRes)
      setSalesSummary(salesSummaryRes)
      setExpensesSummary(expensesSummaryRes)
    } catch (error) {
      console.error('Error loading data:', error)
    }
  }

  const onRefresh = async () => {
    setRefreshing(true)
    await loadData()
    setRefreshing(false)
  }

  const handleSaveSale = async () => {
    try {
      const saleData = {
        ...saleForm,
        date: saleForm.date.toISOString().split('T')[0],
      }
      if (editingItem) {
        await businessFinanceApi.updateSale(editingItem.id, saleData)
      } else {
        await businessFinanceApi.createSale(saleData)
      }
      setShowSaleModal(false)
      setEditingItem(null)
      resetSaleForm()
      loadData()
    } catch (error) {
      console.error('Error saving sale:', error)
    }
  }

  const handleSaveExpense = async () => {
    try {
      const expenseData: any = {
        amount: expenseForm.amount,
        description: expenseForm.description,
        date: expenseForm.date.toISOString().split('T')[0],
        payment_method: expenseForm.payment_method,
        supplier: expenseForm.supplier,
        invoice_number: expenseForm.invoice_number,
        is_tax_deductible: expenseForm.is_tax_deductible,
      }
      
      // Add category ID if selected
      if (expenseForm.category) {
        expenseData.category = parseInt(expenseForm.category)
      }
      
      if (editingItem) {
        await businessFinanceApi.updateExpense(editingItem.id, expenseData)
      } else {
        await businessFinanceApi.createExpense(expenseData)
      }
      setShowExpenseModal(false)
      setEditingItem(null)
      resetExpenseForm()
      loadData()
    } catch (error: any) {
      console.error('Error saving expense:', error)
      Alert.alert('Erro', error.response?.data?.error || 'Não foi possível salvar a despesa. Tente novamente.')
    }
  }

  const handleSaveCategory = async () => {
    try {
      await businessFinanceApi.createCategory({
        ...categoryForm,
        is_business: true,
      })
      setShowCategoryModal(false)
      setCategoryForm({ name: '', icon: 'tag', color: '#ef4444' })
      loadData() // Reload to get new categories
    } catch (error: any) {
      console.error('Error saving category:', error)
      Alert.alert('Erro', error.response?.data?.error || 'Não foi possível criar a categoria. Tente novamente.')
    }
  }

  const resetSaleForm = () => setSaleForm({
    amount: '',
    description: '',
    customer_name: '',
    date: new Date(),
    payment_method: 'cash',
    invoice_number: '',
  })
  
  const resetExpenseForm = () => setExpenseForm({
    category: '',
    amount: '',
    description: '',
    date: new Date(),
    payment_method: 'cash',
    supplier: '',
    invoice_number: '',
    is_tax_deductible: false,
  })

  const openEditSale = (sale: Sale) => {
    setEditingItem(sale)
    // Parse date string to Date object
    let saleDate = new Date()
    if (sale.date) {
      const dateParts = sale.date.split('-')
      if (dateParts.length === 3) {
        saleDate = new Date(parseInt(dateParts[0]), parseInt(dateParts[1]) - 1, parseInt(dateParts[2]))
      }
    }
    setSaleForm({
      amount: sale.amount,
      description: sale.description,
      customer_name: sale.customer_name,
      date: saleDate,
      payment_method: sale.payment_method,
      invoice_number: sale.invoice_number,
    })
    setShowSaleModal(true)
  }

  const openEditExpense = (expense: BusinessExpense) => {
    setEditingItem(expense)
    // Parse date string to Date object
    let expenseDate = new Date()
    if (expense.date) {
      const dateParts = expense.date.split('-')
      if (dateParts.length === 3) {
        expenseDate = new Date(parseInt(dateParts[0]), parseInt(dateParts[1]) - 1, parseInt(dateParts[2]))
      }
    }
    // Find category ID by name
    const categoryId = categories.find(c => c.name === expense.category_name)?.id?.toString() || ''
    setExpenseForm({
      category: categoryId,
      amount: expense.amount,
      description: expense.description,
      date: expenseDate,
      payment_method: expense.payment_method,
      supplier: expense.supplier,
      invoice_number: expense.invoice_number || '',
      is_tax_deductible: expense.is_tax_deductible,
    })
    setShowExpenseModal(true)
  }

  const totalSales = sales.reduce((sum, s) => sum + parseFloat(s.amount), 0)
  const totalExpenses = expenses.reduce((sum, e) => sum + parseFloat(e.amount), 0)
  const profit = totalSales - totalExpenses

  const salesChartData = sales.slice(0, 7).map(sale => parseFloat(sale.amount))
  const expensesChartData = expensesSummary?.by_category?.slice(0, 5).map((cat: any) => ({
    name: cat.category__name || 'Outros',
    amount: parseFloat(cat.total),
    color: '#ef4444',
    legendFontColor: '#7F7F7F',
    legendFontSize: 12,
  })) || []

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.container}>
        <ScrollView
          style={styles.scrollView}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
        {/* Header */}
        <View style={styles.header}>
          <Text variant="headlineSmall" style={styles.title}>Finanças do Negócio</Text>
        </View>

        {/* Metrics Card */}
        <Card style={styles.metricsCard}>
          <Card.Content>
            <View style={styles.metricRow}>
              <View style={styles.metric}>
                <MaterialCommunityIcons name="trending-up" size={24} color="#6366f1" />
                <Text variant="bodySmall" style={styles.metricLabel}>Vendas</Text>
                <Text variant="headlineSmall" style={styles.metricValue}>
                  {formatCurrency(totalSales)}
                </Text>
                <Text variant="bodySmall" style={styles.metricCount}>{sales.length} vendas</Text>
              </View>
              <View style={styles.metric}>
                <MaterialCommunityIcons name="trending-down" size={24} color="#ef4444" />
                <Text variant="bodySmall" style={styles.metricLabel}>Despesas</Text>
                <Text variant="headlineSmall" style={[styles.metricValue, styles.expenseValue]}>
                  {formatCurrency(totalExpenses)}
                </Text>
                <Text variant="bodySmall" style={styles.metricCount}>{expenses.length} despesas</Text>
              </View>
            </View>
            <View style={styles.profitContainer}>
              <MaterialCommunityIcons
                name={profit >= 0 ? "check-circle" : "alert-circle"}
                size={32}
                color={profit >= 0 ? "#10b981" : "#ef4444"}
              />
              <Text variant="bodySmall" style={styles.profitLabel}>Lucro Líquido</Text>
              <Text variant="headlineMedium" style={[styles.profitValue, profit < 0 && styles.profitNegative]}>
                {formatCurrency(profit)}
              </Text>
              <Text variant="bodySmall" style={styles.profitPercentage}>
                {totalSales > 0 ? ((profit / totalSales) * 100).toFixed(1) : 0}% margem
              </Text>
            </View>
          </Card.Content>
        </Card>

        {/* Tabs */}
        <View style={styles.tabsContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabs}>
            {[
              { key: 'overview', label: 'Visão Geral', icon: 'view-dashboard' },
              { key: 'sales', label: 'Vendas', icon: 'cash-plus' },
              { key: 'expenses', label: 'Despesas', icon: 'cash-minus' },
            ].map(tab => (
              <TouchableOpacity
                key={tab.key}
                style={[styles.tab, activeTab === tab.key && styles.tabActive]}
                onPress={() => setActiveTab(tab.key as any)}
              >
                <MaterialCommunityIcons
                  name={tab.icon as any}
                  size={20}
                  color={activeTab === tab.key ? '#10b981' : '#666'}
                />
                <Text style={[styles.tabLabel, activeTab === tab.key && styles.tabLabelActive]}>
                  {tab.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Content based on active tab */}
        {activeTab === 'overview' && (
          <View style={styles.content}>
            {/* Sales Chart */}
            {salesChartData.length > 0 && (
              <Card style={styles.card}>
                <Card.Content>
                  <Text variant="titleMedium" style={styles.sectionTitle}>Vendas Recentes</Text>
                  <LineChart
                    data={{
                      labels: sales.slice(0, 7).map(s => new Date(s.date).toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit' })),
                      datasets: [{ data: salesChartData }],
                    }}
                    width={width - 64}
                    height={220}
                    chartConfig={{
                      backgroundColor: '#fff',
                      backgroundGradientFrom: '#fff',
                      backgroundGradientTo: '#fff',
                      decimalPlaces: 0,
                      color: (opacity = 1) => `rgba(16, 185, 129, ${opacity})`,
                      labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
                    }}
                    bezier
                    style={styles.chart}
                  />
                </Card.Content>
              </Card>
            )}

            {/* Expenses by Category */}
            {expensesChartData.length > 0 && (
              <Card style={styles.card}>
                <Card.Content>
                  <Text variant="titleMedium" style={styles.sectionTitle}>Despesas por Categoria</Text>
                  <PieChart
                    data={expensesChartData}
                    width={width - 64}
                    height={220}
                    chartConfig={{
                      color: (opacity = 1) => `rgba(239, 68, 68, ${opacity})`,
                    }}
                    accessor="amount"
                    backgroundColor="transparent"
                    paddingLeft="15"
                  />
                </Card.Content>
              </Card>
            )}

            {/* Quick Stats */}
            <View style={styles.statsGrid}>
              <Card style={styles.statCard}>
                <Card.Content>
                  <MaterialCommunityIcons name="receipt" size={24} color="#10b981" />
                  <Text variant="headlineSmall" style={styles.statValue}>{sales.length}</Text>
                  <Text variant="bodySmall" style={styles.statLabel}>Vendas</Text>
                </Card.Content>
              </Card>
              <Card style={styles.statCard}>
                <Card.Content>
                  <MaterialCommunityIcons name="file-document" size={24} color="#ef4444" />
                  <Text variant="headlineSmall" style={styles.statValue}>{expenses.length}</Text>
                  <Text variant="bodySmall" style={styles.statLabel}>Despesas</Text>
                </Card.Content>
              </Card>
              <Card style={styles.statCard}>
                <Card.Content>
                  <MaterialCommunityIcons name="percent" size={24} color="#6366f1" />
                  <Text variant="headlineSmall" style={styles.statValue}>
                    {totalSales > 0 ? ((profit / totalSales) * 100).toFixed(0) : 0}%
                  </Text>
                  <Text variant="bodySmall" style={styles.statLabel}>Margem</Text>
                </Card.Content>
              </Card>
            </View>
          </View>
        )}

        {activeTab === 'sales' && (
          <View style={styles.content}>
            {sales.length === 0 ? (
              <Card style={styles.card}>
                <Card.Content style={styles.emptyContent}>
                  <MaterialCommunityIcons name="cash-plus" size={64} color="#ccc" />
                  <Text variant="bodyLarge" style={styles.emptyText}>
                    Nenhuma venda registada
                  </Text>
                  <Button mode="contained" onPress={() => setShowSaleModal(true)}>
                    Registrar Venda
                  </Button>
                </Card.Content>
              </Card>
            ) : (
              sales.map(sale => (
                <Card key={sale.id} style={styles.saleCard} onPress={() => openEditSale(sale)}>
                  <Card.Content>
                    <View style={styles.saleHeader}>
                      <View style={styles.saleLeft}>
                        <View style={styles.saleIcon}>
                          <MaterialCommunityIcons name="cash-plus" size={24} color="#10b981" />
                        </View>
                        <View>
                          <Text variant="titleMedium">{sale.customer_name || 'Cliente não especificado'}</Text>
                          <Text variant="bodySmall" style={styles.saleDescription}>
                            {sale.description}
                          </Text>
                        </View>
                      </View>
                      <Text variant="titleLarge" style={styles.saleAmount}>
                        {formatCurrency(parseFloat(sale.amount))}
                      </Text>
                    </View>
                    <View style={styles.saleFooter}>
                      <Chip icon="calendar" compact>{new Date(sale.date).toLocaleDateString('pt-PT')}</Chip>
                      <Chip icon="credit-card" compact>{sale.payment_method}</Chip>
                      {sale.invoice_number && (
                        <Chip icon="receipt" compact>#{sale.invoice_number}</Chip>
                      )}
                    </View>
                  </Card.Content>
                </Card>
              ))
            )}
          </View>
        )}

        {activeTab === 'expenses' && (
          <View style={styles.content}>
            {expenses.length === 0 ? (
              <Card style={styles.card}>
                <Card.Content style={styles.emptyContent}>
                  <MaterialCommunityIcons name="cash-minus" size={64} color="#ccc" />
                  <Text variant="bodyLarge" style={styles.emptyText}>
                    Nenhuma despesa registada
                  </Text>
                  <Button mode="contained" onPress={() => setShowExpenseModal(true)}>
                    Adicionar Despesa
                  </Button>
                </Card.Content>
              </Card>
            ) : (
              expenses.map(expense => (
                <Card key={expense.id} style={styles.expenseCard} onPress={() => openEditExpense(expense)}>
                  <Card.Content>
                    <View style={styles.expenseHeader}>
                      <View style={styles.expenseLeft}>
                        <View style={[styles.categoryIcon, { backgroundColor: expense.category_color || '#ef4444' }]}>
                          <MaterialCommunityIcons name={expense.category_icon as any || 'tag'} size={20} color="#fff" />
                        </View>
                        <View>
                          <Text variant="titleMedium">{expense.category_name || 'Sem categoria'}</Text>
                          <Text variant="bodySmall" style={styles.expenseDescription}>
                            {expense.description}
                          </Text>
                          {expense.supplier && (
                            <Text variant="bodySmall" style={styles.supplierText}>
                              Fornecedor: {expense.supplier}
                            </Text>
                          )}
                        </View>
                      </View>
                      <Text variant="titleLarge" style={styles.expenseAmount}>
                        {formatCurrency(parseFloat(expense.amount))}
                      </Text>
                    </View>
                    <View style={styles.expenseFooter}>
                      <Chip icon="calendar" compact>{new Date(expense.date).toLocaleDateString('pt-PT')}</Chip>
                      <Chip icon="credit-card" compact>{expense.payment_method}</Chip>
                      {expense.is_tax_deductible && (
                        <Chip icon="receipt" compact style={styles.taxChip}>Dedutível</Chip>
                      )}
                    </View>
                  </Card.Content>
                </Card>
              ))
            )}
          </View>
        )}
      </ScrollView>

      {/* FAB */}
      <FAB
        icon="plus"
        style={styles.fab}
        onPress={() => {
          if (activeTab === 'sales') setShowSaleModal(true)
          else if (activeTab === 'expenses') setShowExpenseModal(true)
        }}
      />

      {/* Sale Modal */}
      <Portal>
        <Modal visible={showSaleModal} onDismiss={() => { setShowSaleModal(false); setEditingItem(null); resetSaleForm() }} contentContainerStyle={styles.modal}>
          <ScrollView>
            <Text variant="headlineSmall" style={styles.modalTitle}>
              {editingItem ? 'Editar Venda' : 'Nova Venda'}
            </Text>
            <TextInput label="Valor" keyboardType="numeric" value={saleForm.amount} onChangeText={(text) => setSaleForm({ ...saleForm, amount: text })} />
            <TextInput label="Descrição" multiline value={saleForm.description} onChangeText={(text) => setSaleForm({ ...saleForm, description: text })} />
            <TextInput label="Cliente" value={saleForm.customer_name} onChangeText={(text) => setSaleForm({ ...saleForm, customer_name: text })} />
            <DatePicker
              label="Data"
              value={saleForm.date}
              onChange={(date) => setSaleForm({ ...saleForm, date: date || new Date() })}
            />
            <TextInput label="Número da Fatura" value={saleForm.invoice_number} onChangeText={(text) => setSaleForm({ ...saleForm, invoice_number: text })} />
            <SegmentedButtons
              value={saleForm.payment_method}
              onValueChange={(value) => setSaleForm({ ...saleForm, payment_method: value })}
              buttons={[
                { value: 'cash', label: 'Dinheiro' },
                { value: 'card', label: 'Cartão' },
                { value: 'transfer', label: 'Transferência' },
                { value: 'check', label: 'Cheque' },
              ]}
            />
            <Button mode="contained" onPress={handleSaveSale} style={styles.modalButton}>
              Salvar
            </Button>
          </ScrollView>
        </Modal>
      </Portal>

      {/* Expense Modal */}
      <Portal>
        <Modal visible={showExpenseModal} onDismiss={() => { setShowExpenseModal(false); setEditingItem(null); resetExpenseForm() }} contentContainerStyle={styles.modal}>
          <ScrollView>
            <Text variant="headlineSmall" style={styles.modalTitle}>
              {editingItem ? 'Editar Despesa' : 'Nova Despesa'}
            </Text>
            
            {/* Category Selection */}
            <View style={styles.dropdownContainer}>
              <View style={styles.categoryHeader}>
                <Text variant="bodySmall" style={styles.label}>Categoria</Text>
                <Button
                  mode="text"
                  compact
                  onPress={() => setShowCategoryModal(true)}
                  icon="plus"
                >
                  Nova Categoria
                </Button>
              </View>
              <Menu
                visible={showCategoryMenu}
                onDismiss={() => setShowCategoryMenu(false)}
                anchor={
                  <TouchableOpacity
                    style={styles.dropdownButton}
                    onPress={() => setShowCategoryMenu(true)}
                  >
                    <View style={styles.dropdownContent}>
                      {expenseForm.category ? (
                        <>
                          {(() => {
                            const selectedCat = categories.find(c => c.id.toString() === expenseForm.category)
                            return selectedCat ? (
                              <>
                                <MaterialCommunityIcons
                                  name={selectedCat.icon as any || 'tag'}
                                  size={20}
                                  color={selectedCat.color || '#ef4444'}
                                  style={styles.dropdownIcon}
                                />
                                <Text variant="bodyLarge" style={styles.dropdownText}>
                                  {selectedCat.name}
                                </Text>
                              </>
                            ) : null
                          })()}
                        </>
                      ) : (
                        <>
                          <MaterialCommunityIcons name="tag" size={20} color="#999" style={styles.dropdownIcon} />
                          <Text variant="bodyLarge" style={[styles.dropdownText, styles.placeholderText]}>
                            Selecione uma categoria
                          </Text>
                        </>
                      )}
                    </View>
                    <MaterialCommunityIcons name="chevron-down" size={20} color="#999" />
                  </TouchableOpacity>
                }
              >
                <Menu.Item
                  onPress={() => {
                    setExpenseForm({ ...expenseForm, category: '' })
                    setShowCategoryMenu(false)
                  }}
                  title="Sem categoria"
                />
                {categories.map(category => (
                  <Menu.Item
                    key={category.id}
                    onPress={() => {
                      setExpenseForm({ ...expenseForm, category: category.id.toString() })
                      setShowCategoryMenu(false)
                    }}
                    title={category.name}
                    leadingIcon={() => (
                      <MaterialCommunityIcons
                        name={category.icon as any || 'tag'}
                        size={20}
                        color={category.color || '#ef4444'}
                      />
                    )}
                  />
                ))}
              </Menu>
            </View>
            
            <TextInput label="Valor" keyboardType="numeric" value={expenseForm.amount} onChangeText={(text) => setExpenseForm({ ...expenseForm, amount: text })} />
            <TextInput label="Descrição" multiline value={expenseForm.description} onChangeText={(text) => setExpenseForm({ ...expenseForm, description: text })} />
            <TextInput label="Fornecedor" value={expenseForm.supplier} onChangeText={(text) => setExpenseForm({ ...expenseForm, supplier: text })} />
            <DatePicker
              label="Data"
              value={expenseForm.date}
              onChange={(date) => setExpenseForm({ ...expenseForm, date: date || new Date() })}
            />
            <TextInput label="Número da Fatura" value={expenseForm.invoice_number} onChangeText={(text) => setExpenseForm({ ...expenseForm, invoice_number: text })} />
            <SegmentedButtons
              value={expenseForm.payment_method}
              onValueChange={(value) => setExpenseForm({ ...expenseForm, payment_method: value })}
              buttons={[
                { value: 'cash', label: 'Dinheiro' },
                { value: 'card', label: 'Cartão' },
                { value: 'transfer', label: 'Transferência' },
                { value: 'check', label: 'Cheque' },
              ]}
            />
            <Button mode="contained" onPress={handleSaveExpense} style={styles.modalButton}>
              Salvar
            </Button>
          </ScrollView>
        </Modal>
      </Portal>

      {/* Category Modal */}
      <Portal>
        <Modal 
          visible={showCategoryModal} 
          onDismiss={() => { 
            setShowCategoryModal(false)
            setCategoryForm({ name: '', icon: 'tag', color: '#ef4444' })
          }} 
          contentContainerStyle={styles.modal}
        >
          <ScrollView>
            <Text variant="headlineSmall" style={styles.modalTitle}>
              Nova Categoria
            </Text>
            <TextInput
              label="Nome da Categoria"
              value={categoryForm.name}
              onChangeText={(text) => setCategoryForm({ ...categoryForm, name: text })}
              style={styles.input}
            />
            
            {/* Icon Selection */}
            <Text variant="bodySmall" style={styles.label}>Ícone</Text>
            <View style={styles.iconGrid}>
              {['tag', 'briefcase', 'factory', 'truck', 'tools', 'store', 'office-building', 'warehouse', 'package-variant', 'cart'].map(icon => (
                <TouchableOpacity
                  key={icon}
                  style={[
                    styles.iconOption,
                    categoryForm.icon === icon && styles.iconOptionSelected,
                    { backgroundColor: categoryForm.color + '20' }
                  ]}
                  onPress={() => setCategoryForm({ ...categoryForm, icon })}
                >
                  <MaterialCommunityIcons
                    name={icon as any}
                    size={24}
                    color={categoryForm.icon === icon ? categoryForm.color : '#666'}
                  />
                </TouchableOpacity>
              ))}
            </View>
            
            {/* Color Selection */}
            <Text variant="bodySmall" style={styles.label}>Cor</Text>
            <View style={styles.colorGrid}>
              {['#ef4444', '#f59e0b', '#10b981', '#6366f1', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'].map(color => (
                <TouchableOpacity
                  key={color}
                  style={[
                    styles.colorOption,
                    categoryForm.color === color && styles.colorOptionSelected,
                    { backgroundColor: color }
                  ]}
                  onPress={() => setCategoryForm({ ...categoryForm, color })}
                >
                  {categoryForm.color === color && (
                    <MaterialCommunityIcons name="check" size={20} color="#fff" />
                  )}
                </TouchableOpacity>
              ))}
            </View>
            
            <Button 
              mode="contained" 
              onPress={handleSaveCategory} 
              style={styles.modalButton}
              disabled={!categoryForm.name.trim()}
            >
              Criar Categoria
            </Button>
          </ScrollView>
        </Modal>
      </Portal>
      </View>
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
  scrollView: {
    flex: 1,
  },
  header: {
    padding: 16,
    paddingTop: 8,
    backgroundColor: '#fff',
  },
  title: {
    fontWeight: 'bold',
    color: '#1f2937',
  },
  metricsCard: {
    margin: 16,
    borderRadius: 16,
    elevation: 4,
    backgroundColor: '#fff',
  },
  metricRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
  },
  metric: {
    alignItems: 'center',
    flex: 1,
  },
  metricLabel: {
    color: '#666',
    marginTop: 8,
    marginBottom: 4,
  },
  metricValue: {
    fontWeight: 'bold',
    color: '#6366f1',
  },
  expenseValue: {
    color: '#ef4444',
  },
  metricCount: {
    color: '#999',
    fontSize: 12,
    marginTop: 4,
  },
  profitContainer: {
    alignItems: 'center',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  profitLabel: {
    color: '#666',
    marginTop: 8,
    marginBottom: 4,
  },
  profitValue: {
    fontWeight: 'bold',
    color: '#10b981',
  },
  profitNegative: {
    color: '#ef4444',
  },
  profitPercentage: {
    color: '#999',
    fontSize: 12,
    marginTop: 4,
  },
  tabsContainer: {
    backgroundColor: '#fff',
    paddingVertical: 8,
  },
  tabs: {
    flexDirection: 'row',
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginHorizontal: 4,
    borderRadius: 20,
  },
  tabActive: {
    backgroundColor: '#ecfdf5',
  },
  tabLabel: {
    marginLeft: 6,
    color: '#666',
    fontSize: 14,
  },
  tabLabelActive: {
    color: '#10b981',
    fontWeight: '600',
  },
  content: {
    padding: 16,
  },
  card: {
    marginBottom: 12,
    borderRadius: 12,
    elevation: 2,
  },
  emptyContent: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  emptyText: {
    marginTop: 16,
    marginBottom: 24,
    color: '#999',
    textAlign: 'center',
  },
  saleCard: {
    marginBottom: 12,
    borderRadius: 12,
    elevation: 2,
  },
  saleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  saleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  saleIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#ecfdf5',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  saleDescription: {
    color: '#666',
    marginTop: 4,
  },
  saleAmount: {
    fontWeight: 'bold',
    color: '#10b981',
  },
  saleFooter: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  expenseCard: {
    marginBottom: 12,
    borderRadius: 12,
    elevation: 2,
  },
  expenseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  expenseLeft: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    flex: 1,
  },
  categoryIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  expenseDescription: {
    color: '#666',
    marginTop: 4,
  },
  supplierText: {
    color: '#999',
    marginTop: 2,
    fontSize: 12,
  },
  expenseAmount: {
    fontWeight: 'bold',
    color: '#ef4444',
  },
  expenseFooter: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
    flexWrap: 'wrap',
  },
  taxChip: {
    backgroundColor: '#dbeafe',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 16,
  },
  statCard: {
    flex: 1,
    minWidth: '30%',
    borderRadius: 12,
  },
  statValue: {
    fontWeight: 'bold',
    marginTop: 8,
    color: '#1f2937',
  },
  statLabel: {
    color: '#666',
    marginTop: 4,
  },
  sectionTitle: {
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#1f2937',
  },
  chart: {
    marginVertical: 8,
    borderRadius: 16,
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
    backgroundColor: '#10b981',
  },
  modal: {
    backgroundColor: '#fff',
    padding: 24,
    margin: 20,
    borderRadius: 16,
    maxHeight: '80%',
  },
  modalTitle: {
    fontWeight: 'bold',
    marginBottom: 16,
  },
  modalButton: {
    marginTop: 16,
  },
  dropdownContainer: {
    marginBottom: 16,
  },
  categoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  label: {
    color: '#666',
    fontSize: 14,
    fontWeight: '600',
  },
  dropdownButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    minHeight: 56,
  },
  dropdownContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  dropdownIcon: {
    marginRight: 12,
  },
  dropdownText: {
    flex: 1,
    color: '#1f2937',
  },
  placeholderText: {
    color: '#999',
  },
  iconGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16,
  },
  iconOption: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  iconOptionSelected: {
    borderColor: '#ef4444',
  },
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16,
  },
  colorOption: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  colorOptionSelected: {
    borderColor: '#1f2937',
    borderWidth: 3,
  },
  input: {
    marginBottom: 12,
  },
})
