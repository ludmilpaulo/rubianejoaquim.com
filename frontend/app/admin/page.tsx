'use client'

import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuthStore } from '@/lib/store'
import { adminApi, authApi } from '@/lib/api'
import { getApiErrorMessage } from '@/lib/types/api'
import { logger } from '@/lib/logger'
import ZendaPageLoading from '@/components/zenda/ZendaPageLoading'

interface RecentUser {
  first_name?: string
  last_name?: string
}

interface RecentEnrollment {
  id: number
  status: string
  user?: RecentUser
  course?: { title?: string }
}

interface RecentPayment {
  id: number
  status: string
  enrollment?: {
    user?: RecentUser
    course?: { title?: string }
  }
}

interface Stats {
  totalCourses: number
  activeCourses: number
  totalLessons: number
  freeLessons: number
  totalEnrollments: number
  activeEnrollments: number
  pendingEnrollments: number
  totalUsers: number
  totalMentorshipRequests: number
  pendingPayments: number
  approvedPayments: number
  rejectedPayments: number
  totalProgress: number
  pendingMobileProofs: number
  recentEnrollments: RecentEnrollment[]
  recentPayments: RecentPayment[]
}

interface SubAnalytics {
  totalUsers: number
  active: number
  monthlyRevenue: number
  expiringSoon: number
  currency: string
  usersByCountry: Array<{
    country: string
    users: number
    active: number
    trial: number
    pct: number
  }>
}

type ActionItem = {
  href?: string
  title: string
  description: string
  accent?: 'primary' | 'growth' | 'amber' | 'navy'
  onClick?: () => void
  cta?: string
}

function isAdminUser(user: {
  is_admin?: boolean
  is_staff?: boolean
  is_superuser?: boolean
} | null) {
  return Boolean(user?.is_admin || user?.is_staff || user?.is_superuser)
}

function displayName(user: { first_name?: string; last_name?: string; username?: string } | null) {
  if (!user) return 'Admin'
  const full = [user.first_name, user.last_name].filter(Boolean).join(' ').trim()
  return full || user.username || 'Admin'
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('')
}

function personLabel(user?: RecentUser) {
  const name = [user?.first_name, user?.last_name].filter(Boolean).join(' ').trim()
  return name || 'Utilizador'
}

function statusBadge(kind: 'enrollment' | 'payment', status: string) {
  if (kind === 'enrollment') {
    if (status === 'active') return { label: 'Ativa', className: 'bg-emerald-50 text-emerald-700 ring-emerald-200' }
    if (status === 'pending') return { label: 'Pendente', className: 'bg-amber-50 text-amber-800 ring-amber-200' }
    return { label: status, className: 'bg-slate-100 text-slate-600 ring-slate-200' }
  }
  if (status === 'approved') return { label: 'Aprovado', className: 'bg-emerald-50 text-emerald-700 ring-emerald-200' }
  if (status === 'rejected') return { label: 'Rejeitado', className: 'bg-red-50 text-red-700 ring-red-200' }
  return { label: 'Pendente', className: 'bg-amber-50 text-amber-800 ring-amber-200' }
}

function accentClasses(accent: ActionItem['accent'] = 'primary') {
  switch (accent) {
    case 'growth':
      return {
        icon: 'bg-emerald-50 text-zenda-growth',
        hover: 'hover:border-zenda-growth/40 hover:shadow-[0_12px_40px_-24px_rgba(77,184,61,0.55)]',
      }
    case 'amber':
      return {
        icon: 'bg-amber-50 text-amber-700',
        hover: 'hover:border-amber-300 hover:shadow-[0_12px_40px_-24px_rgba(217,119,6,0.45)]',
      }
    case 'navy':
      return {
        icon: 'bg-zenda-navy/5 text-zenda-navy',
        hover: 'hover:border-zenda-navy/20 hover:shadow-[0_12px_40px_-24px_rgba(5,5,11,0.35)]',
      }
    default:
      return {
        icon: 'bg-zenda-container text-zenda-primary',
        hover: 'hover:border-zenda-primary/35 hover:shadow-[0_12px_40px_-24px_rgba(53,52,201,0.45)]',
      }
  }
}

function IconBook() {
  return (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
    </svg>
  )
}

function IconUsers() {
  return (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
    </svg>
  )
}

function IconChat() {
  return (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
    </svg>
  )
}

function IconPay() {
  return (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  )
}

function IconPhone() {
  return (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
    </svg>
  )
}

function IconArrow() {
  return (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
    </svg>
  )
}

function MetricCard({
  label,
  value,
  hint,
  icon,
  loading,
  tone = 'default',
}: {
  label: string
  value: number | string
  hint?: string
  icon: ReactNode
  loading?: boolean
  tone?: 'default' | 'warn' | 'growth'
}) {
  const toneClass =
    tone === 'warn'
      ? 'from-amber-50/80 to-white border-amber-200/70'
      : tone === 'growth'
        ? 'from-emerald-50/70 to-white border-emerald-200/60'
        : 'from-white to-zenda-container/40 border-zenda-border'

  return (
    <div className={`relative overflow-hidden rounded-2xl border bg-gradient-to-br p-5 sm:p-6 ${toneClass}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] sm:text-xs font-semibold uppercase tracking-[0.14em] text-zenda-textSecondary">
            {label}
          </p>
          {loading ? (
            <div className="mt-3 h-8 w-16 animate-pulse rounded-md bg-zenda-border/70" />
          ) : (
            <p className="mt-2 font-display text-3xl sm:text-4xl font-semibold tracking-tight text-zenda-navy tabular-nums">
              {value}
            </p>
          )}
          {hint ? <p className="mt-2 text-xs text-zenda-textSecondary">{hint}</p> : null}
        </div>
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/80 text-zenda-primary ring-1 ring-zenda-border">
          {icon}
        </div>
      </div>
    </div>
  )
}

function pct(part: number, total: number) {
  if (!total) return 0
  return Math.min(100, Math.round((part / total) * 100))
}

function AnalyticsBar({
  label,
  value,
  total,
  color = 'bg-zenda-primary',
}: {
  label: string
  value: number
  total: number
  color?: string
}) {
  const width = pct(value, total)
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between gap-3 text-sm">
        <span className="text-zenda-textSecondary">{label}</span>
        <span className="font-semibold tabular-nums text-zenda-navy">
          {value}
          <span className="ml-1.5 text-xs font-medium text-zenda-textSecondary">{width}%</span>
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-zenda-bg">
        <div className={`h-full rounded-full transition-all duration-500 ${color}`} style={{ width: `${width}%` }} />
      </div>
    </div>
  )
}

function ActionCard({ item, icon }: { item: ActionItem; icon: ReactNode }) {
  const accents = accentClasses(item.accent)
  const body = (
    <>
      <div className="flex items-start justify-between gap-3">
        <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${accents.icon}`}>{icon}</div>
        <span className="mt-1 text-zenda-textSecondary/70 transition group-hover:text-zenda-primary">
          <IconArrow />
        </span>
      </div>
      <h3 className="mt-4 text-base font-semibold text-zenda-navy">{item.title}</h3>
      <p className="mt-1.5 text-sm leading-relaxed text-zenda-textSecondary">{item.description}</p>
      {item.cta ? (
        <span className="mt-4 inline-flex text-sm font-semibold text-zenda-primary">{item.cta}</span>
      ) : null}
    </>
  )

  const className = `group block rounded-2xl border border-zenda-border bg-white p-5 sm:p-6 transition-all duration-300 ${accents.hover}`

  if (item.href) {
    return (
      <Link href={item.href} className={className}>
        {body}
      </Link>
    )
  }

  return (
    <button type="button" onClick={item.onClick} className={`${className} w-full text-left`}>
      {body}
    </button>
  )
}

function Section({
  eyebrow,
  title,
  description,
  action,
  children,
}: {
  eyebrow: string
  title: string
  description?: string
  action?: ReactNode
  children: ReactNode
}) {
  return (
    <section className="mb-10 sm:mb-12">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div className="max-w-2xl">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-zenda-primary">{eyebrow}</p>
          <h2 className="mt-1.5 font-display text-2xl sm:text-3xl font-semibold text-zenda-navy tracking-tight">
            {title}
          </h2>
          {description ? <p className="mt-2 text-sm sm:text-base text-zenda-textSecondary">{description}</p> : null}
        </div>
        {action}
      </div>
      {children}
    </section>
  )
}

export default function AdminDashboard() {
  const router = useRouter()
  const { user, checkAuth, isLoading } = useAuthStore()
  const [mounted, setMounted] = useState(false)
  const [stats, setStats] = useState<Stats>({
    totalCourses: 0,
    activeCourses: 0,
    totalLessons: 0,
    freeLessons: 0,
    totalEnrollments: 0,
    activeEnrollments: 0,
    pendingEnrollments: 0,
    totalUsers: 0,
    totalMentorshipRequests: 0,
    pendingPayments: 0,
    approvedPayments: 0,
    rejectedPayments: 0,
    totalProgress: 0,
    pendingMobileProofs: 0,
    recentEnrollments: [],
    recentPayments: [],
  })
  const [subAnalytics, setSubAnalytics] = useState<SubAnalytics | null>(null)
  const [loadingStats, setLoadingStats] = useState(true)
  const [statsError, setStatsError] = useState(false)
  const [sendingUpdateEmail, setSendingUpdateEmail] = useState(false)
  const [appVersion, setAppVersion] = useState('')
  const [showUpdateModal, setShowUpdateModal] = useState(false)
  const [updateResult, setUpdateResult] = useState<{
    sent_count: number
    total_users: number
    failed_count: number
  } | null>(null)

  const todayLabel = useMemo(
    () =>
      new Intl.DateTimeFormat('pt-PT', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      }).format(new Date()),
    [],
  )

  useEffect(() => {
    setMounted(true)
    checkAuth().then(() => {
      const currentUser = useAuthStore.getState().user
      if (!isAdminUser(currentUser)) {
        router.push('/login')
      }
    })
  }, [checkAuth, router])

  useEffect(() => {
    if (!mounted || !isAdminUser(user)) return

    const fetchStats = async () => {
      try {
        setStatsError(false)
        const [statsRes, subRes] = await Promise.all([
          adminApi.stats(),
          adminApi.subscriptions.analytics('30d').catch((error: unknown) => {
            logger.error('Error fetching subscription analytics:', error)
            return null
          }),
        ])
        const data = statsRes.data as {
          total_courses?: number
          active_courses?: number
          total_lessons?: number
          free_lessons?: number
          total_enrollments?: number
          active_enrollments?: number
          pending_enrollments?: number
          total_users?: number
          total_mentorship_requests?: number
          pending_payments?: number
          approved_payments?: number
          rejected_payments?: number
          total_progress?: number
          pending_mobile_subscription_proofs?: number
          recent_enrollments?: RecentEnrollment[]
          recent_payments?: RecentPayment[]
        }
        setStats({
          totalCourses: data.total_courses ?? 0,
          activeCourses: data.active_courses ?? 0,
          totalLessons: data.total_lessons ?? 0,
          freeLessons: data.free_lessons ?? 0,
          totalEnrollments: data.total_enrollments ?? 0,
          activeEnrollments: data.active_enrollments ?? 0,
          pendingEnrollments: data.pending_enrollments ?? 0,
          totalUsers: data.total_users ?? 0,
          totalMentorshipRequests: data.total_mentorship_requests ?? 0,
          pendingPayments: data.pending_payments ?? 0,
          approvedPayments: data.approved_payments ?? 0,
          rejectedPayments: data.rejected_payments ?? 0,
          totalProgress: data.total_progress ?? 0,
          pendingMobileProofs: data.pending_mobile_subscription_proofs ?? 0,
          recentEnrollments: data.recent_enrollments ?? [],
          recentPayments: data.recent_payments ?? [],
        })

        if (subRes?.data) {
          const payload = subRes.data as {
            kpis?: {
              total_users?: { value?: number }
              active_subscriptions?: { value?: number }
              monthly_revenue?: { value?: number; currency?: string }
              expiring_soon?: { value?: number }
            }
            pricing?: { currency?: string }
            users_by_country?: Array<{
              country?: string
              users?: number
              active?: number
              trial?: number
              pct?: number
            }>
          }
          const kpis = payload.kpis
          setSubAnalytics({
            totalUsers: kpis?.total_users?.value ?? 0,
            active: kpis?.active_subscriptions?.value ?? 0,
            monthlyRevenue: kpis?.monthly_revenue?.value ?? 0,
            expiringSoon: kpis?.expiring_soon?.value ?? 0,
            currency: kpis?.monthly_revenue?.currency ?? payload.pricing?.currency ?? 'AOA',
            usersByCountry: Array.isArray(payload.users_by_country)
              ? payload.users_by_country.map((row) => ({
                  country: (row.country || 'unknown').toUpperCase(),
                  users: row.users ?? 0,
                  active: row.active ?? 0,
                  trial: row.trial ?? 0,
                  pct: row.pct ?? 0,
                }))
              : [],
          })
        }
      } catch (error: unknown) {
        logger.error('Error fetching admin stats:', error)
        setStatsError(true)
      } finally {
        setLoadingStats(false)
      }
    }

    void fetchStats()
  }, [mounted, user])

  if (!mounted || isLoading) {
    return <ZendaPageLoading />
  }

  if (!isAdminUser(user)) {
    return null
  }

  const name = displayName(user)
  const attentionCount = stats.pendingPayments + stats.pendingMobileProofs

  const learningActions: ActionItem[] = [
    {
      href: '/admin/courses',
      title: 'Cursos',
      description: 'Criar, editar e publicar cursos e módulos.',
      accent: 'primary',
    },
    {
      href: '/admin/lessons',
      title: 'Aulas',
      description: 'Gerir conteúdo das aulas e materiais.',
      accent: 'primary',
    },
    {
      href: '/admin/education',
      title: 'Education marketplace',
      description: 'Instructors, moderação, comissões e payouts.',
      accent: 'growth',
    },
    {
      href: '/admin/questions',
      title: 'Perguntas',
      description: 'Quiz e perguntas de múltipla escolha.',
      accent: 'navy',
    },
  ]

  const contentActions: ActionItem[] = [
    {
      href: '/admin/cms',
      title: 'Site CMS',
      description: 'Homepage, serviços, navegação, leads e SEO.',
      accent: 'amber',
    },
    {
      href: '/admin/portfolio',
      title: 'Portfolio',
      description: 'Projetos, testemunhos e conteúdos avançados.',
      accent: 'navy',
    },
  ]

  const opsActions: ActionItem[] = [
    {
      href: '/admin/enrollments',
      title: 'Matrículas',
      description: 'Ver e aprovar matrículas de alunos.',
      accent: 'primary',
    },
    {
      href: '/admin/payments',
      title: 'Pagamentos',
      description: 'Comprovativos e aprovações financeiras.',
      accent: stats.pendingPayments > 0 ? 'amber' : 'primary',
    },
    {
      href: '/admin/subscriptions',
      title: 'Subscrições Zenda',
      description: 'Trial, IAP e comprovativos do app móvel.',
      accent: stats.pendingMobileProofs > 0 ? 'amber' : 'growth',
    },
    {
      href: '/admin/mentorship',
      title: 'Mentoria',
      description: 'Pedidos e acompanhamento de mentoria.',
      accent: 'navy',
    },
    {
      href: '/admin/users',
      title: 'Utilizadores',
      description: 'Contas, permissões e acesso.',
      accent: 'navy',
    },
    {
      href: '/admin/user-points',
      title: 'Pontos',
      description: 'Saldos, referrals e ajustes manuais.',
      accent: 'amber',
    },
    {
      href: '/admin/analytics',
      title: 'Estatísticas',
      description: 'Análises e relatórios do negócio.',
      accent: 'primary',
    },
  ]

  const systemActions: ActionItem[] = [
    {
      title: 'Notificar atualização do app',
      description: 'Enviar email profissional a todos os utilizadores ativos do Zenda.',
      accent: 'primary',
      cta: 'Enviar email a todos',
      onClick: () => {
        setShowUpdateModal(true)
        setUpdateResult(null)
        setAppVersion('')
      },
    },
    {
      href: '/admin/settings/payments',
      title: 'Definições de pagamentos',
      description: 'Gateway iKhokha e configuração de billing.',
      accent: 'navy',
    },
    {
      href: '/admin/settings/email',
      title: 'Definições de email',
      description: 'SMTP e templates de notificação.',
      accent: 'navy',
    },
  ]

  return (
    <div className="relative min-h-screen min-w-0 overflow-hidden bg-[#F4F5FB] text-zenda-navy">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[420px] bg-[radial-gradient(ellipse_at_top,_rgba(53,52,201,0.14),_transparent_58%),linear-gradient(180deg,#0B0D2A_0%,#15186A_42%,transparent_100%)] opacity-95"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -right-24 top-24 h-72 w-72 rounded-full bg-zenda-growth/20 blur-3xl"
      />

      <div
        className="relative mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8 lg:py-10"
        style={{
          paddingLeft: 'max(1rem, env(safe-area-inset-left, 1rem))',
          paddingRight: 'max(1rem, env(safe-area-inset-right, 1rem))',
        }}
      >
        <header className="mb-8 sm:mb-10">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/70">
                Rubiane Joaquim · Consola
              </p>
              <h1 className="mt-3 font-display text-3xl sm:text-4xl lg:text-[2.75rem] font-semibold tracking-tight text-white">
                Painel de administração
              </h1>
              <p className="mt-3 text-sm sm:text-base text-white/75">
                Bem-vindo, <span className="font-medium text-white">{name}</span>. Gere cursos, pagamentos,
                CMS e a app Zenda num só lugar.
              </p>
            </div>

            <div className="flex items-center gap-3 rounded-2xl border border-white/15 bg-white/10 px-4 py-3 backdrop-blur-md">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white text-sm font-bold text-zenda-primary">
                {initials(name)}
              </div>
              <div>
                <p className="text-sm font-semibold text-white">{name}</p>
                <p className="text-xs capitalize text-white/65">{todayLabel}</p>
              </div>
            </div>
          </div>
        </header>

        {statsError ? (
          <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            Não foi possível carregar as estatísticas do painel. Os valores abaixo podem estar desatualizados.
          </div>
        ) : null}

        {attentionCount > 0 ? (
          <div className="mb-8 overflow-hidden rounded-2xl border border-amber-200/80 bg-gradient-to-r from-amber-50 to-white shadow-sm">
            <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-amber-700">
                  Requer atenção
                </p>
                <p className="mt-1 text-base font-semibold text-zenda-navy">
                  {attentionCount} item{attentionCount === 1 ? '' : 's'} pendente{attentionCount === 1 ? '' : 's'}
                </p>
                <p className="mt-1 text-sm text-zenda-textSecondary">
                  {stats.pendingPayments > 0
                    ? `${stats.pendingPayments} pagamento${stats.pendingPayments === 1 ? '' : 's'} de curso`
                    : null}
                  {stats.pendingPayments > 0 && stats.pendingMobileProofs > 0 ? ' · ' : null}
                  {stats.pendingMobileProofs > 0
                    ? `${stats.pendingMobileProofs} comprovativo${stats.pendingMobileProofs === 1 ? '' : 's'} da app`
                    : null}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {stats.pendingPayments > 0 ? (
                  <Link
                    href="/admin/payments"
                    className="inline-flex items-center rounded-xl bg-zenda-navy px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-zenda-primary"
                  >
                    Ver pagamentos
                  </Link>
                ) : null}
                {stats.pendingMobileProofs > 0 ? (
                  <Link
                    href="/admin/subscriptions"
                    className="inline-flex items-center rounded-xl border border-zenda-border bg-white px-4 py-2.5 text-sm font-semibold text-zenda-navy transition hover:border-zenda-primary/40"
                  >
                    Ver subscrições
                  </Link>
                ) : null}
              </div>
            </div>
          </div>
        ) : null}

        <Section
          eyebrow="Visão geral"
          title="Indicadores principais"
          description="Estado atual da plataforma educativa e financeira."
        >
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4 sm:gap-5">
            <MetricCard
              label="Cursos"
              value={stats.totalCourses}
              hint={`${stats.activeCourses} activos`}
              icon={<IconBook />}
              loading={loadingStats}
            />
            <MetricCard
              label="Utilizadores"
              value={stats.totalUsers}
              hint={`${stats.activeEnrollments} matrículas activas`}
              icon={<IconUsers />}
              loading={loadingStats}
              tone="growth"
            />
            <MetricCard
              label="Mentoria"
              value={stats.totalMentorshipRequests}
              hint="Pedidos recebidos"
              icon={<IconChat />}
              loading={loadingStats}
            />
            <MetricCard
              label="Pendentes"
              value={stats.pendingPayments}
              hint={
                stats.pendingMobileProofs > 0
                  ? `+ ${stats.pendingMobileProofs} comprovativo(s) app`
                  : 'Pagamentos por aprovar'
              }
              icon={<IconPay />}
              loading={loadingStats}
              tone={stats.pendingPayments > 0 ? 'warn' : 'default'}
            />
          </div>
        </Section>

        <Section
          eyebrow="Analytics"
          title="Desempenho da plataforma"
          description="Distribuição de conteúdo, matrículas, pagamentos e app Zenda."
          action={
            <Link
              href="/admin/analytics"
              className="text-sm font-semibold text-zenda-primary hover:underline"
            >
              Ver relatório completo
            </Link>
          }
        >
          {loadingStats ? (
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="h-48 animate-pulse rounded-2xl border border-zenda-border bg-white"
                />
              ))}
            </div>
          ) : (
            <div className="space-y-5">
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                <div className="rounded-2xl border border-zenda-border bg-white p-5 sm:p-6">
                  <h3 className="text-sm font-semibold text-zenda-navy">Cursos e aulas</h3>
                  <div className="mt-4 space-y-4">
                    <AnalyticsBar
                      label="Cursos activos"
                      value={stats.activeCourses}
                      total={stats.totalCourses || 1}
                      color="bg-zenda-primary"
                    />
                    <AnalyticsBar
                      label="Aulas grátis"
                      value={stats.freeLessons}
                      total={stats.totalLessons || 1}
                      color="bg-emerald-500"
                    />
                    <div className="flex justify-between border-t border-zenda-border pt-3 text-sm">
                      <span className="text-zenda-textSecondary">Total de aulas</span>
                      <span className="font-semibold tabular-nums text-zenda-navy">
                        {stats.totalLessons}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-zenda-textSecondary">Aulas concluídas</span>
                      <span className="font-semibold tabular-nums text-zenda-navy">
                        {stats.totalProgress}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-zenda-border bg-white p-5 sm:p-6">
                  <h3 className="text-sm font-semibold text-zenda-navy">Matrículas</h3>
                  <div className="mt-4 space-y-4">
                    <AnalyticsBar
                      label="Activas"
                      value={stats.activeEnrollments}
                      total={stats.totalEnrollments || 1}
                      color="bg-emerald-500"
                    />
                    <AnalyticsBar
                      label="Pendentes"
                      value={stats.pendingEnrollments}
                      total={stats.totalEnrollments || 1}
                      color="bg-amber-500"
                    />
                    <div className="flex justify-between border-t border-zenda-border pt-3 text-sm">
                      <span className="text-zenda-textSecondary">Total</span>
                      <span className="font-semibold tabular-nums text-zenda-navy">
                        {stats.totalEnrollments}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-zenda-border bg-white p-5 sm:p-6">
                  <h3 className="text-sm font-semibold text-zenda-navy">Pagamentos (cursos)</h3>
                  <div className="mt-4 space-y-4">
                    <AnalyticsBar
                      label="Aprovados"
                      value={stats.approvedPayments}
                      total={Math.max(
                        1,
                        stats.approvedPayments + stats.pendingPayments + stats.rejectedPayments,
                      )}
                      color="bg-emerald-500"
                    />
                    <AnalyticsBar
                      label="Pendentes"
                      value={stats.pendingPayments}
                      total={Math.max(
                        1,
                        stats.approvedPayments + stats.pendingPayments + stats.rejectedPayments,
                      )}
                      color="bg-amber-500"
                    />
                    <AnalyticsBar
                      label="Rejeitados"
                      value={stats.rejectedPayments}
                      total={Math.max(
                        1,
                        stats.approvedPayments + stats.pendingPayments + stats.rejectedPayments,
                      )}
                      color="bg-rose-500"
                    />
                  </div>
                </div>
              </div>

              {subAnalytics ? (
                <div className="space-y-4">
                  <div className="rounded-2xl border border-zenda-border bg-gradient-to-br from-zenda-navy to-[#1e1b4b] p-5 sm:p-6 text-white">
                    <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/60">
                          App Zenda
                        </p>
                        <h3 className="mt-1 font-display text-xl font-semibold">Subscrições mobile</h3>
                      </div>
                      <Link
                        href="/admin/subscriptions"
                        className="text-sm font-semibold text-white/90 underline-offset-2 hover:underline"
                      >
                        Gerir subscrições
                      </Link>
                    </div>
                    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                      <div>
                        <p className="text-xs text-white/55">Utilizadores app</p>
                        <p className="mt-1 font-display text-2xl font-semibold tabular-nums">
                          {subAnalytics.totalUsers}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-white/55">Activas</p>
                        <p className="mt-1 font-display text-2xl font-semibold tabular-nums">
                          {subAnalytics.active}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-white/55">Receita do mês</p>
                        <p className="mt-1 font-display text-2xl font-semibold tabular-nums">
                          {Math.round(subAnalytics.monthlyRevenue).toLocaleString('pt-PT')}
                          <span className="ml-1 text-sm font-medium text-white/60">
                            {subAnalytics.currency}
                          </span>
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-white/55">A expirar (7 dias)</p>
                        <p className="mt-1 font-display text-2xl font-semibold tabular-nums">
                          {subAnalytics.expiringSoon}
                        </p>
                      </div>
                    </div>
                  </div>

                  {subAnalytics.usersByCountry.length > 0 ? (
                    <div className="rounded-2xl border border-zenda-border bg-white p-5 sm:p-6">
                      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
                        <div>
                          <h3 className="text-sm font-semibold text-zenda-navy">
                            Utilizadores da app por país
                          </h3>
                          <p className="mt-1 text-xs text-zenda-textSecondary">
                            Distribuição com base no país do perfil do utilizador.
                          </p>
                        </div>
                        <Link
                          href="/admin/subscriptions"
                          className="text-xs font-semibold text-zenda-primary hover:underline"
                        >
                          Ver detalhe
                        </Link>
                      </div>
                      <div className="space-y-4">
                        {subAnalytics.usersByCountry.map((row) => {
                          const code = row.country
                          let label = 'Desconhecido'
                          if (code && code !== 'UNKNOWN') {
                            try {
                              label =
                                new Intl.DisplayNames(['pt-PT'], { type: 'region' }).of(code) || code
                            } catch {
                              label = code
                            }
                          }
                          return (
                            <AnalyticsBar
                              key={code || 'unknown'}
                              label={
                                code && code !== 'UNKNOWN' ? `${label} (${code})` : label
                              }
                              value={row.users}
                              total={subAnalytics.totalUsers || 1}
                              color="bg-zenda-primary"
                            />
                          )
                        })}
                      </div>
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>
          )}
        </Section>

        <Section
          eyebrow="Aprendizagem"
          title="Conteúdo e educação"
          description="Cursos, aulas, marketplace e avaliação."
        >
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {learningActions.map((item) => (
              <ActionCard
                key={item.href ?? item.title}
                item={item}
                icon={item.href === '/admin/education' ? <IconUsers /> : <IconBook />}
              />
            ))}
          </div>
        </Section>

        <Section
          eyebrow="Marca & site"
          title="Presença pública"
          description="Conteúdo do website e portfolio."
        >
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {contentActions.map((item) => (
              <ActionCard key={item.href} item={item} icon={<IconBook />} />
            ))}
          </div>
        </Section>

        <Section
          eyebrow="Operações"
          title="Alunos, finanças e acesso"
          description="Fluxos do dia a dia da academia e da app."
        >
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {opsActions.map((item) => (
              <ActionCard
                key={item.href}
                item={item}
                icon={
                  item.href === '/admin/subscriptions' ? (
                    <IconPhone />
                  ) : item.href === '/admin/payments' || item.href === '/admin/user-points' ? (
                    <IconPay />
                  ) : item.href === '/admin/mentorship' ? (
                    <IconChat />
                  ) : (
                    <IconUsers />
                  )
                }
              />
            ))}
          </div>
        </Section>

        <Section eyebrow="Sistema" title="Configuração e comunicações">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {systemActions.map((item) => (
              <ActionCard
                key={item.href ?? item.title}
                item={item}
                icon={item.title.includes('Notificar') ? <IconPhone /> : <IconPay />}
              />
            ))}
          </div>
        </Section>

        <Section eyebrow="Actividade" title="Movimento recente">
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            <div className="rounded-2xl border border-zenda-border bg-white">
              <div className="flex items-center justify-between border-b border-zenda-border px-5 py-4">
                <h3 className="text-sm font-semibold text-zenda-navy">Matrículas</h3>
                <Link href="/admin/enrollments" className="text-xs font-semibold text-zenda-primary hover:underline">
                  Ver todas
                </Link>
              </div>
              <div className="p-3 sm:p-4">
                {loadingStats ? (
                  <div className="space-y-3 p-2">
                    {[0, 1, 2].map((i) => (
                      <div key={i} className="h-14 animate-pulse rounded-xl bg-zenda-bg" />
                    ))}
                  </div>
                ) : stats.recentEnrollments.length > 0 ? (
                  <ul className="space-y-2">
                    {stats.recentEnrollments.slice(0, 5).map((enrollment) => {
                      const badge = statusBadge('enrollment', enrollment.status)
                      return (
                        <li
                          key={enrollment.id}
                          className="flex items-center justify-between gap-3 rounded-xl px-3 py-3 transition hover:bg-zenda-bg"
                        >
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-zenda-navy">
                              {personLabel(enrollment.user)}
                            </p>
                            <p className="truncate text-xs text-zenda-textSecondary">
                              {enrollment.course?.title || 'Curso'}
                            </p>
                          </div>
                          <span
                            className={`shrink-0 rounded-lg px-2.5 py-1 text-[11px] font-semibold ring-1 ${badge.className}`}
                          >
                            {badge.label}
                          </span>
                        </li>
                      )
                    })}
                  </ul>
                ) : (
                  <p className="px-3 py-10 text-center text-sm text-zenda-textSecondary">
                    Nenhuma matrícula recente
                  </p>
                )}
              </div>
            </div>

            <div className="rounded-2xl border border-zenda-border bg-white">
              <div className="flex items-center justify-between border-b border-zenda-border px-5 py-4">
                <h3 className="text-sm font-semibold text-zenda-navy">Pagamentos</h3>
                <Link href="/admin/payments" className="text-xs font-semibold text-zenda-primary hover:underline">
                  Ver todos
                </Link>
              </div>
              <div className="p-3 sm:p-4">
                {loadingStats ? (
                  <div className="space-y-3 p-2">
                    {[0, 1, 2].map((i) => (
                      <div key={i} className="h-14 animate-pulse rounded-xl bg-zenda-bg" />
                    ))}
                  </div>
                ) : stats.recentPayments.length > 0 ? (
                  <ul className="space-y-2">
                    {stats.recentPayments.slice(0, 5).map((payment) => {
                      const badge = statusBadge('payment', payment.status)
                      return (
                        <li
                          key={payment.id}
                          className="flex items-center justify-between gap-3 rounded-xl px-3 py-3 transition hover:bg-zenda-bg"
                        >
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-zenda-navy">
                              {personLabel(payment.enrollment?.user)}
                            </p>
                            <p className="truncate text-xs text-zenda-textSecondary">
                              {payment.enrollment?.course?.title || 'Pagamento'}
                            </p>
                          </div>
                          <span
                            className={`shrink-0 rounded-lg px-2.5 py-1 text-[11px] font-semibold ring-1 ${badge.className}`}
                          >
                            {badge.label}
                          </span>
                        </li>
                      )
                    })}
                  </ul>
                ) : (
                  <p className="px-3 py-10 text-center text-sm text-zenda-textSecondary">
                    Nenhum pagamento recente
                  </p>
                )}
              </div>
            </div>
          </div>
        </Section>
      </div>

      {showUpdateModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-zenda-navy/50 p-4 backdrop-blur-sm">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="app-update-title"
            className="w-full max-w-md overflow-hidden rounded-2xl border border-zenda-border bg-white shadow-2xl"
          >
            <div className="border-b border-zenda-border bg-gradient-to-r from-zenda-navy to-zenda-primary px-6 py-5 text-white">
              <h3 id="app-update-title" className="font-display text-xl font-semibold">
                Notificar atualização do app
              </h3>
              <p className="mt-1 text-sm text-white/75">
                Email profissional para todos os utilizadores activos.
              </p>
            </div>
            <div className="p-6">
              {!updateResult ? (
                <>
                  <label className="mb-2 block text-sm font-medium text-zenda-navy">
                    Versão do app (opcional)
                  </label>
                  <input
                    type="text"
                    value={appVersion}
                    onChange={(e) => setAppVersion(e.target.value)}
                    placeholder="ex: 1.0.13"
                    className="zenda-input mb-5"
                  />
                  <div className="flex justify-end gap-3">
                    <button
                      type="button"
                      onClick={() => setShowUpdateModal(false)}
                      className="rounded-xl px-4 py-2.5 text-sm font-medium text-zenda-textSecondary hover:bg-zenda-bg"
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      onClick={async () => {
                        setSendingUpdateEmail(true)
                        try {
                          const res = await authApi.sendAppUpdateNotification(appVersion || 'Nova versão')
                          const data = (res?.data ?? res) as {
                            sent_count?: number
                            total_users?: number
                            failed_count?: number
                          }
                          setUpdateResult({
                            sent_count: data.sent_count ?? 0,
                            total_users: data.total_users ?? 0,
                            failed_count: data.failed_count ?? 0,
                          })
                        } catch (err: unknown) {
                          alert(
                            getApiErrorMessage(
                              err,
                              'Erro ao enviar emails. Confirme Admin → Email (SMTP) e tente novamente.',
                            ),
                          )
                        } finally {
                          setSendingUpdateEmail(false)
                        }
                      }}
                      disabled={sendingUpdateEmail}
                      className="rounded-xl bg-zenda-primary px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-zenda-dark disabled:opacity-50"
                    >
                      {sendingUpdateEmail ? 'A enviar...' : 'Enviar a todos'}
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div className="py-2 text-center">
                    <p className="font-semibold text-zenda-growth">Emails enviados com sucesso</p>
                    <p className="mt-1 text-sm text-zenda-textSecondary">
                      {updateResult.sent_count} de {updateResult.total_users} utilizadores.
                      {updateResult.failed_count > 0 ? (
                        <span className="text-amber-700"> ({updateResult.failed_count} falharam)</span>
                      ) : null}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowUpdateModal(false)}
                    className="mt-4 w-full rounded-xl bg-zenda-primary py-2.5 text-sm font-semibold text-white hover:bg-zenda-dark"
                  >
                    Fechar
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
