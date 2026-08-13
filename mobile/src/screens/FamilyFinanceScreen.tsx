import React, { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Platform,
  ScrollView,
  Share,
  StyleSheet,
  Switch,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'
import { Button, Text } from 'react-native-paper'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useFocusEffect, useRoute, type RouteProp } from '@react-navigation/native'
import { financeSpaceApi } from '../services/api'
import { useI18n } from '../contexts/I18nContext'
import { useCurrency } from '../contexts/CurrencyContext'
import { useAppSelector } from '../hooks/redux'
import { useAlert } from '../hooks/useAlert'
import ZendaCard from '../components/ui/ZendaCard'
import EmptyState from '../components/ui/EmptyState'
import { ZendaLoader } from '../components/ui/ZendaLoader'
import CurrencyPicker from '../components/CurrencyPicker'
import { colors, spacing, typography } from '../theme'
import { getDefaultCurrency, type CurrencyCode } from '../utils/currency'
import { getApiErrorMessage, unwrapList } from '../types/api'
import type {
  FamilyDashboard,
  FamilyEntry,
  FamilyEntryKind,
  FamilyMember,
  FamilyPreview,
  FamilySettleSuggestion,
  FamilySpace,
  FamilyVisibility,
} from '../types/api'
import type { HomeStackParamList } from '../navigation/types'
import { consumePendingFamilyInvite } from '../navigation/linking'

type Tab = 'dashboard' | 'ledger' | 'settle' | 'calendar' | 'settings'

const KINDS: FamilyEntryKind[] = ['income', 'expense', 'debt', 'bill', 'contribution']

function todayIso() {
  return new Date().toISOString().slice(0, 10)
}

export default function FamilyFinanceScreen() {
  const { t, tw } = useI18n()
  const { formatOriginal } = useCurrency()
  const alert = useAlert()
  const user = useAppSelector((state) => state.auth.user)
  const route = useRoute<RouteProp<HomeStackParamList, 'FamilyFinance'>>()

  const [spaces, setSpaces] = useState<FamilySpace[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selected, setSelected] = useState<FamilySpace | null>(null)
  const [created, setCreated] = useState<FamilySpace | null>(null)
  const [tab, setTab] = useState<Tab>('dashboard')

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [currency, setCurrency] = useState<CurrencyCode>(getDefaultCurrency())
  const [requireApproval, setRequireApproval] = useState(true)
  const [creating, setCreating] = useState(false)

  const [inviteCode, setInviteCode] = useState('')
  const [preview, setPreview] = useState<FamilyPreview | null>(null)
  const [previewing, setPreviewing] = useState(false)
  const [joining, setJoining] = useState(false)
  const [pendingBanner, setPendingBanner] = useState<FamilyPreview | null>(null)

  const [dashboard, setDashboard] = useState<FamilyDashboard | null>(null)
  const [dashLoading, setDashLoading] = useState(false)
  const [entries, setEntries] = useState<FamilyEntry[]>([])
  const [suggestions, setSuggestions] = useState<FamilySettleSuggestion[]>([])

  const [entryKind, setEntryKind] = useState<FamilyEntryKind>('expense')
  const [entryTitle, setEntryTitle] = useState('')
  const [entryAmount, setEntryAmount] = useState('')
  const [entryCurrency, setEntryCurrency] = useState<CurrencyCode>(getDefaultCurrency())
  const [entryVisibility, setEntryVisibility] = useState<FamilyVisibility>('family')
  const [entryDue, setEntryDue] = useState('')
  const [savingEntry, setSavingEntry] = useState(false)

  const [goalTitle, setGoalTitle] = useState('')
  const [goalAmount, setGoalAmount] = useState('')
  const [budgetName, setBudgetName] = useState('')
  const [budgetAmount, setBudgetAmount] = useState('')

  const myRole = useMemo(() => {
    if (!selected || !user) return null
    return selected.members?.find((m) => m.user === user.id)?.role ?? null
  }, [selected, user])
  const isOwner = myRole === 'owner'
  const canWrite = myRole === 'owner' || myRole === 'adult' || myRole === 'child'

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = unwrapList<FamilySpace>(await financeSpaceApi.listSpaces())
      setSpaces(data)
      setSelected((current) => {
        if (!current) return current
        return data.find((s) => s.id === current.id) || current
      })
    } catch (err) {
      setError(getApiErrorMessage(err, 'api.errors.generic'))
      setSpaces([])
    } finally {
      setLoading(false)
    }
  }, [])

  useFocusEffect(
    useCallback(() => {
      load()
    }, [load]),
  )

  useEffect(() => {
    let cancelled = false
    const run = async () => {
      const fromRoute = route.params?.inviteCode
      const stored = fromRoute ? null : await consumePendingFamilyInvite()
      const code = (fromRoute || stored || '').trim().toUpperCase()
      if (!code || cancelled) return
      setInviteCode(code)
      setPreviewing(true)
      try {
        const data = (await financeSpaceApi.previewSpace(code)) as FamilyPreview
        if (cancelled) return
        setPreview(data)
        setPendingBanner(data)
      } catch (err) {
        if (cancelled) return
        setPreview(null)
        alert.error(getApiErrorMessage(err, 'family.invalidCode'))
      } finally {
        if (!cancelled) setPreviewing(false)
      }
    }
    run()
    return () => {
      cancelled = true
    }
    // Preview once per invite code from the route or pending store.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [route.params?.inviteCode])

  useEffect(() => {
    const spaceId = route.params?.spaceId
    if (!spaceId || spaces.length === 0) return
    const match = spaces.find((s) => s.id === spaceId)
    if (match) setSelected(match)
  }, [route.params?.spaceId, spaces])

  const loadDetail = useCallback(async (space: FamilySpace) => {
    setDashLoading(true)
    try {
      const [dash, list, settle] = await Promise.all([
        financeSpaceApi.getDashboard(space.id) as Promise<FamilyDashboard>,
        financeSpaceApi.listEntries(space.id) as Promise<FamilyEntry[] | { results: FamilyEntry[] }>,
        financeSpaceApi.getSettle(space.id) as Promise<{ suggestions: FamilySettleSuggestion[] }>,
      ])
      setDashboard(dash)
      setEntries(unwrapList<FamilyEntry>(list))
      setSuggestions(settle.suggestions || [])
    } catch (err) {
      alert.error(getApiErrorMessage(err, 'api.errors.generic'))
    } finally {
      setDashLoading(false)
    }
    // alert identity is not stable
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (selected) {
      setEntryCurrency((selected.currency || getDefaultCurrency()).toUpperCase() as CurrencyCode)
      loadDetail(selected)
    }
  }, [selected, loadDetail])

  const createSpace = async () => {
    if (!name.trim()) return
    setCreating(true)
    try {
      const space = (await financeSpaceApi.createSpace({
        name: name.trim(),
        currency,
        description: description.trim(),
        require_approval: requireApproval,
      })) as FamilySpace
      setName('')
      setDescription('')
      setCreated(space)
      await load()
    } catch (err) {
      alert.error(getApiErrorMessage(err, 'api.errors.generic'))
    } finally {
      setCreating(false)
    }
  }

  const join = async () => {
    if (!inviteCode.trim()) return
    setJoining(true)
    try {
      const result = (await financeSpaceApi.joinSpace(inviteCode.trim())) as FamilySpace & {
        status?: string
        code?: string
      }
      if (result.status === 'pending') {
        alert.success(t('family.requestSent'))
        setPendingBanner(preview)
      } else if (result.code === 'already_member') {
        alert.info(t('family.title'), t('family.alreadyMember'))
        const match = spaces.find((s) => s.invite_code === inviteCode.trim().toUpperCase())
        if (match) setSelected(match)
        else await load()
      } else {
        alert.success(t('family.joined'))
        setSelected(result)
        await load()
      }
      setInviteCode('')
      setPreview(null)
    } catch (err) {
      alert.error(getApiErrorMessage(err, 'family.invalidCode'))
    } finally {
      setJoining(false)
    }
  }

  const shareFamily = async (space: FamilySpace) => {
    const link = space.invite_url || `https://www.rubianejoaquim.com/family/join/${space.invite_code}`
    const message = tw('family.shareMessage', { link, code: space.invite_code })
    try {
      await Share.share(
        Platform.OS === 'ios' ? { message, url: link } : { message },
        { dialogTitle: t('family.share') },
      )
    } catch {
      // user cancelled
    }
  }

  const copyText = async (value: string) => {
    try {
      await Share.share({ message: value })
    } catch {
      // user cancelled
    }
  }

  const saveEntry = async () => {
    if (!selected || !entryTitle.trim() || !entryAmount) return
    setSavingEntry(true)
    try {
      const amount = Number(entryAmount)
      const members = (dashboard?.members || selected.members || []).filter((m) => m.status === 'active')
      const shares =
        entryKind === 'expense' && members.length > 0
          ? members.map((m) => ({
              user: m.user,
              share_amount: (amount / members.length).toFixed(2),
            }))
          : undefined
      await financeSpaceApi.createEntry({
        space: selected.id,
        kind: entryKind,
        title: entryTitle.trim(),
        amount: entryAmount,
        currency: entryCurrency,
        date: todayIso(),
        visibility: entryVisibility,
        due_date: entryDue.trim() || undefined,
        shares,
      })
      setEntryTitle('')
      setEntryAmount('')
      setEntryDue('')
      await loadDetail(selected)
    } catch (err) {
      alert.error(getApiErrorMessage(err, 'family.fxUnavailable'))
    } finally {
      setSavingEntry(false)
    }
  }

  const roleLabel = (role: string) => {
    if (role === 'owner') return t('family.roleOwner')
    if (role === 'adult') return t('family.roleAdult')
    if (role === 'child') return t('family.roleChild')
    return t('family.roleViewer')
  }

  const renderInviteCard = () => (
    <ZendaCard>
      <Text style={styles.label}>{t('family.join')}</Text>
      {pendingBanner ? (
        <Text style={styles.inviteBanner}>{tw('family.invitedTo', { name: pendingBanner.name })}</Text>
      ) : null}
      <TextInput
        style={styles.input}
        value={inviteCode}
        onChangeText={setInviteCode}
        placeholder={t('family.inviteCode')}
        autoCapitalize="characters"
      />
      <Button mode="outlined" onPress={() => {
        const trimmed = inviteCode.trim().toUpperCase()
        if (!trimmed) return
        setInviteCode(trimmed)
        setPreviewing(true)
        financeSpaceApi.previewSpace(trimmed)
          .then((data) => {
            setPreview(data as FamilyPreview)
            setPendingBanner(data as FamilyPreview)
          })
          .catch((err) => {
            setPreview(null)
            alert.error(getApiErrorMessage(err, 'family.invalidCode'))
          })
          .finally(() => setPreviewing(false))
      }} loading={previewing} disabled={previewing}>
        {t('family.joinWithCode')}
      </Button>
      {preview ? (
        <View style={styles.previewBox}>
          <Text style={styles.spaceName}>{preview.name}</Text>
          <Text style={styles.meta}>
            {tw('family.membersCount', { count: preview.member_count })} · {preview.currency}
          </Text>
          <Button mode="contained" onPress={join} loading={joining} disabled={joining} style={styles.mt}>
            {preview.require_approval ? t('family.requestJoin') : t('family.joinBtn')}
          </Button>
        </View>
      ) : null}
    </ZendaCard>
  )

  const renderCreateSuccess = (space: FamilySpace) => (
    <ZendaCard variant="elevated">
      <Text style={styles.spaceName}>{t('family.created')}</Text>
      <Text style={styles.code}>{t('family.code')}: {space.invite_code}</Text>
      <Button mode="contained" onPress={() => shareFamily(space)} style={styles.mt}>{t('family.share')}</Button>
      <Button mode="outlined" onPress={() => copyText(space.invite_code)} style={styles.mt}>{t('family.copyCode')}</Button>
      <Button mode="outlined" onPress={() => copyText(space.invite_url)} style={styles.mt}>{t('family.copyLink')}</Button>
      <Button
        mode="contained"
        onPress={() => {
          setCreated(null)
          setSelected(space)
        }}
        style={styles.mt}
      >
        {t('family.viewFamily')}
      </Button>
    </ZendaCard>
  )

  const renderList = () => (
    <>
      <ZendaCard variant="glass">
        <Text style={styles.label}>{t('family.create')}</Text>
        <TextInput style={styles.input} value={name} onChangeText={setName} placeholder={t('family.spaceName')} />
        <TextInput
          style={styles.input}
          value={description}
          onChangeText={setDescription}
          placeholder={t('family.description')}
        />
        <CurrencyPicker value={currency} onChange={setCurrency} label={t('family.baseCurrency')} showName />
        <View style={styles.switchRow}>
          <Text style={styles.switchLabel}>{t('family.requireApproval')}</Text>
          <Switch value={requireApproval} onValueChange={setRequireApproval} />
        </View>
        <Button mode="contained" onPress={createSpace} loading={creating} disabled={creating || !name.trim()}>
          {creating ? t('family.creating') : t('family.createBtn')}
        </Button>
      </ZendaCard>

      {created ? renderCreateSuccess(created) : null}
      {renderInviteCard()}

      {spaces.length === 0 ? (
        <EmptyState icon="account-group" title={t('family.empty')} />
      ) : (
        spaces.map((s) => (
          <TouchableOpacity key={s.id} onPress={() => setSelected(s)} activeOpacity={0.85}>
            <ZendaCard variant="elevated">
              <Text style={styles.spaceName}>{s.name}</Text>
              <Text style={styles.code}>{t('family.code')}: {s.invite_code}</Text>
              <Text style={styles.meta}>
                {tw('family.membersCount', { count: s.member_count ?? s.members?.filter((m) => m.status === 'active').length ?? 0 })}
                {' · '}
                {s.currency}
              </Text>
              <Button mode="text" onPress={() => setSelected(s)}>{t('family.viewFamily')}</Button>
            </ZendaCard>
          </TouchableOpacity>
        ))
      )}
    </>
  )

  const money = (amount: string | number, ccy: string) => formatOriginal(amount, ccy)

  const renderDashboard = () => {
    if (dashLoading && !dashboard) {
      return <ZendaLoader message={t('family.loadingFinances')} inline />
    }
    if (!dashboard || !selected) return null
    const ccy = dashboard.currency
    return (
      <>
        <View style={styles.grid}>
          {[
            [t('family.income'), money(dashboard.income, ccy)],
            [t('family.expenses'), money(dashboard.expenses, ccy)],
            [t('family.balance'), money(dashboard.balance, ccy)],
            [t('family.savings'), money(dashboard.savings, ccy)],
            [t('family.debts'), money(dashboard.debts, ccy)],
            [t('family.budget'), `${Math.round(dashboard.budget_pct)}%`],
          ].map(([label, value]) => (
            <ZendaCard key={label} style={styles.statCard}>
              <Text style={styles.meta}>{label}</Text>
              <Text style={styles.statValue}>{value}</Text>
            </ZendaCard>
          ))}
        </View>
        <ZendaCard>
          <Text style={styles.label}>{t('family.members')}</Text>
          {(dashboard.members || []).map((m) => (
            <Text key={m.id} style={styles.rowText}>
              {m.display_name || m.user_email} · {roleLabel(m.role)}
            </Text>
          ))}
        </ZendaCard>
        {isOwner && (dashboard.pending || []).length > 0 ? (
          <ZendaCard>
            <Text style={styles.label}>{t('family.pendingRequests')}</Text>
            {dashboard.pending.map((m) => (
              <View key={m.id} style={styles.rowBetween}>
                <Text style={styles.rowText}>{m.display_name || m.user_email}</Text>
                <View style={styles.row}>
                  <Button compact onPress={() => financeSpaceApi.approveMember(selected.id, m.user, 'approve').then(() => loadDetail(selected))}>
                    {t('family.approve')}
                  </Button>
                  <Button compact onPress={() => financeSpaceApi.approveMember(selected.id, m.user, 'decline').then(() => loadDetail(selected))}>
                    {t('family.decline')}
                  </Button>
                </View>
              </View>
            ))}
          </ZendaCard>
        ) : null}
        <ZendaCard>
          <Text style={styles.label}>{t('family.activity')}</Text>
          {(dashboard.activity || []).length === 0 ? (
            <Text style={styles.meta}>{t('family.noActivity')}</Text>
          ) : (
            dashboard.activity.map((a) => (
              <Text key={a.id} style={styles.rowText}>{a.message}</Text>
            ))
          )}
        </ZendaCard>
      </>
    )
  }

  const renderLedger = () => (
    <>
      {canWrite ? (
        <ZendaCard variant="glass">
          <View style={styles.chipRow}>
            {KINDS.map((kind) => (
              <TouchableOpacity
                key={kind}
                onPress={() => setEntryKind(kind)}
                style={[styles.chip, entryKind === kind && styles.chipOn]}
              >
                <Text style={styles.chipText}>
                  {kind === 'income' ? t('family.addIncome') : kind === 'expense' ? t('family.addExpense') : kind === 'debt' ? t('family.addDebt') : kind === 'bill' ? t('family.addBill') : t('family.addGoal')}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <TextInput style={styles.input} value={entryTitle} onChangeText={setEntryTitle} placeholder={t('family.entryTitle')} />
          <TextInput style={styles.input} value={entryAmount} onChangeText={setEntryAmount} placeholder={t('common.amount')} keyboardType="decimal-pad" />
          <CurrencyPicker value={entryCurrency} onChange={setEntryCurrency} label={t('family.baseCurrency')} />
          <TextInput style={styles.input} value={entryDue} onChangeText={setEntryDue} placeholder={t('family.calendar')} />
          <View style={styles.chipRow}>
            {(['family', 'private', 'selected'] as FamilyVisibility[]).map((v) => (
              <TouchableOpacity key={v} onPress={() => setEntryVisibility(v)} style={[styles.chip, entryVisibility === v && styles.chipOn]}>
                <Text style={styles.chipText}>
                  {v === 'private' ? t('family.visibilityPrivate') : v === 'selected' ? t('family.visibilitySelected') : t('family.visibilityFamily')}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <Button mode="contained" onPress={saveEntry} loading={savingEntry} disabled={savingEntry}>
            {t('common.add')}
          </Button>
        </ZendaCard>
      ) : null}
      {entries.length === 0 ? (
        <EmptyState icon="cash" title={t('family.noEntries')} />
      ) : (
        entries.map((e) => (
          <ZendaCard key={e.id}>
            <Text style={styles.spaceName}>{e.title}</Text>
            <Text style={styles.code}>{money(e.amount, e.currency)}</Text>
            {e.converted_amount && e.currency !== selected?.currency ? (
              <Text style={styles.meta}>≈ {money(e.converted_amount, selected?.currency || e.currency)}</Text>
            ) : null}
            <Text style={styles.meta}>{e.kind} · {e.date} · {e.visibility}</Text>
          </ZendaCard>
        ))
      )}
    </>
  )

  const renderSettle = () => (
    <ZendaCard>
      <Text style={styles.label}>{t('family.settleUp')}</Text>
      {suggestions.length === 0 ? (
        <Text style={styles.meta}>{t('family.noActivity')}</Text>
      ) : (
        suggestions.map((s, idx) => (
          <View key={`${s.from_user}-${s.to_user}-${idx}`} style={styles.settleRow}>
            <Text style={styles.rowText}>
              {s.from_name} → {s.to_name}: {money(s.amount, s.currency)}
            </Text>
            {canWrite ? (
              <Button
                compact
                onPress={() => {
                  if (!selected) return
                  financeSpaceApi
                    .recordSettlement(selected.id, {
                      from_user: s.from_user,
                      to_user: s.to_user,
                      amount: s.amount,
                      currency: s.currency,
                      status: 'paid',
                    })
                    .then(() => loadDetail(selected))
                    .catch((err) => alert.error(getApiErrorMessage(err, 'api.errors.generic')))
                }}
              >
                {t('family.markPaid')}
              </Button>
            ) : null}
          </View>
        ))
      )}
    </ZendaCard>
  )

  const renderCalendar = () => {
    const upcoming = dashboard?.upcoming || entries.filter((e) => e.due_date)
    return (
      <ZendaCard>
        <Text style={styles.label}>{t('family.upcoming')}</Text>
        {upcoming.length === 0 ? (
          <Text style={styles.meta}>{t('family.noUpcoming')}</Text>
        ) : (
          upcoming.map((e) => (
            <Text key={e.id} style={styles.rowText}>
              {e.due_date || e.date} · {e.title} · {money(e.amount, e.currency)}
            </Text>
          ))
        )}
      </ZendaCard>
    )
  }

  const renderSettings = () => {
    if (!selected) return null
    return (
      <>
        <ZendaCard>
          <Text style={styles.label}>{t('family.settings')}</Text>
          <Text style={styles.code}>{t('family.code')}: {selected.invite_code}</Text>
          <Button mode="outlined" onPress={() => shareFamily(selected)}>{t('family.share')}</Button>
          <Button mode="outlined" onPress={() => copyText(selected.invite_code)} style={styles.mt}>{t('family.copyCode')}</Button>
          <Button mode="outlined" onPress={() => copyText(selected.invite_url)} style={styles.mt}>{t('family.copyLink')}</Button>
          {isOwner ? (
            <>
              <Button
                mode="outlined"
                style={styles.mt}
                onPress={() =>
                  financeSpaceApi.regenerateCode(selected.id).then((s: FamilySpace) => {
                    setSelected(s)
                    load()
                  })
                }
              >
                {t('family.regenerateCode')}
              </Button>
              <Button
                mode="outlined"
                style={styles.mt}
                onPress={() =>
                  financeSpaceApi.revokeInvite(selected.id).then((s: FamilySpace) => setSelected(s))
                }
              >
                {t('family.revokeLink')}
              </Button>
            </>
          ) : null}
          {(dashboard?.members || []).map((m: FamilyMember) => (
            <View key={m.id} style={styles.memberRow}>
              <Text style={styles.rowText}>{m.display_name || m.user_email} · {roleLabel(m.role)}</Text>
              {isOwner && m.role !== 'owner' ? (
                <View style={styles.chipRow}>
                  {(['adult', 'child', 'viewer', 'owner'] as const).map((role) => (
                    <TouchableOpacity
                      key={role}
                      style={styles.chip}
                      onPress={() =>
                        financeSpaceApi.setRole(selected.id, m.id, role).then(() => loadDetail(selected))
                      }
                    >
                      <Text style={styles.chipText}>{roleLabel(role)}</Text>
                    </TouchableOpacity>
                  ))}
                  <Button compact onPress={() => financeSpaceApi.removeMember(selected.id, m.user).then(() => loadDetail(selected))}>
                    {t('family.removeMember')}
                  </Button>
                </View>
              ) : null}
            </View>
          ))}
          <Button
            mode="outlined"
            style={styles.mt}
            onPress={() =>
              alert.confirm(t('family.leave'), tw('family.leaveConfirm', { name: selected.name }), () => {
                financeSpaceApi.leaveSpace(selected.id).then(() => {
                  setSelected(null)
                  load()
                })
              })
            }
          >
            {t('family.leave')}
          </Button>
        </ZendaCard>
        {canWrite ? (
          <ZendaCard>
            <Text style={styles.label}>{t('family.goals')}</Text>
            <TextInput style={styles.input} value={goalTitle} onChangeText={setGoalTitle} placeholder={t('family.entryTitle')} />
            <TextInput style={styles.input} value={goalAmount} onChangeText={setGoalAmount} placeholder={t('common.amount')} keyboardType="decimal-pad" />
            <Button
              mode="contained"
              onPress={() => {
                if (!goalTitle.trim() || !goalAmount) return
                financeSpaceApi
                  .createGoal({
                    space: selected.id,
                    title: goalTitle.trim(),
                    target_amount: goalAmount,
                    currency: selected.currency,
                  })
                  .then(() => {
                    setGoalTitle('')
                    setGoalAmount('')
                    loadDetail(selected)
                  })
              }}
            >
              {t('family.addGoal')}
            </Button>
            <Text style={[styles.label, styles.mt]}>{t('family.budget')}</Text>
            <TextInput style={styles.input} value={budgetName} onChangeText={setBudgetName} placeholder={t('family.entryTitle')} />
            <TextInput style={styles.input} value={budgetAmount} onChangeText={setBudgetAmount} placeholder={t('common.amount')} keyboardType="decimal-pad" />
            <Button
              mode="contained"
              onPress={() => {
                if (!budgetName.trim() || !budgetAmount) return
                const now = new Date()
                financeSpaceApi
                  .createBudget({
                    space: selected.id,
                    name: budgetName.trim(),
                    amount: budgetAmount,
                    currency: selected.currency,
                    month: now.getMonth() + 1,
                    year: now.getFullYear(),
                  })
                  .then(() => {
                    setBudgetName('')
                    setBudgetAmount('')
                    loadDetail(selected)
                  })
              }}
            >
              {t('family.addBudget')}
            </Button>
          </ZendaCard>
        ) : null}
      </>
    )
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>{t('family.title')}</Text>
        <Text style={styles.sub}>{t('family.subtitle')}</Text>

        {loading ? (
          <ZendaLoader message={t('family.loadingFinances')} inline />
        ) : error ? (
          <EmptyState icon="alert-circle" title={t('common.error')} description={error} actionLabel={t('common.retry')} onAction={load} />
        ) : selected ? (
          <>
            <TouchableOpacity onPress={() => setSelected(null)}>
              <Text style={styles.back}>{t('common.back')}</Text>
            </TouchableOpacity>
            <Text style={styles.spaceName}>{selected.name}</Text>
            <View style={styles.chipRow}>
              {(['dashboard', 'ledger', 'settle', 'calendar', 'settings'] as Tab[]).map((item) => (
                <TouchableOpacity key={item} onPress={() => setTab(item)} style={[styles.chip, tab === item && styles.chipOn]}>
                  <Text style={styles.chipText}>
                    {item === 'dashboard'
                      ? t('family.dashboard')
                      : item === 'ledger'
                        ? t('family.sharedExpense')
                        : item === 'settle'
                          ? t('family.settleUp')
                          : item === 'calendar'
                            ? t('family.calendar')
                            : t('family.settings')}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            {tab === 'dashboard' && renderDashboard()}
            {tab === 'ledger' && renderLedger()}
            {tab === 'settle' && renderSettle()}
            {tab === 'calendar' && renderCalendar()}
            {tab === 'settings' && renderSettings()}
          </>
        ) : (
          renderList()
        )}
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background.default },
  content: { padding: spacing.md, paddingBottom: spacing.xl },
  title: { ...typography.h1, color: colors.text.primary },
  sub: { ...typography.body, color: colors.text.secondary, marginBottom: spacing.lg },
  label: { ...typography.label, color: colors.text.secondary, marginBottom: spacing.sm },
  input: {
    borderWidth: 1,
    borderColor: colors.border.light,
    borderRadius: 8,
    padding: spacing.md,
    marginBottom: spacing.md,
    backgroundColor: colors.background.paper,
    color: colors.text.primary,
  },
  spaceName: { ...typography.h3, color: colors.text.primary },
  code: { ...typography.caption, color: colors.brand.primary, marginVertical: spacing.sm },
  meta: { ...typography.caption, color: colors.text.secondary },
  back: { color: colors.brand.primary, marginBottom: spacing.sm, fontWeight: '600' },
  mt: { marginTop: spacing.sm },
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.md },
  switchLabel: { ...typography.body, color: colors.text.primary, flex: 1, marginRight: spacing.sm },
  previewBox: { marginTop: spacing.md },
  inviteBanner: { ...typography.body, color: colors.brand.primary, marginBottom: spacing.sm, fontWeight: '600' },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: spacing.md },
  chip: {
    borderWidth: 1,
    borderColor: colors.border.light,
    borderRadius: 16,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
  },
  chipOn: { backgroundColor: colors.brand.primary + '22', borderColor: colors.brand.primary },
  chipText: { ...typography.caption, color: colors.text.primary },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.md },
  statCard: { width: '47%', marginBottom: 0 },
  statValue: { ...typography.h3, color: colors.text.primary, marginTop: 4 },
  row: { flexDirection: 'row' },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: spacing.sm },
  rowText: { ...typography.body, color: colors.text.primary, marginTop: 4 },
  settleRow: { marginTop: spacing.sm },
  memberRow: { marginTop: spacing.md },
})
