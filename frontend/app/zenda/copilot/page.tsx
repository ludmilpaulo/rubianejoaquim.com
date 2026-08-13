'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useAuthStore } from '@/lib/store'
import { useLocale } from '@/contexts/LocaleContext'
import {
  aiCopilotApi,
  type CopilotConversationListItem,
  type CopilotFacts,
  type CopilotInsights,
  type CopilotMessage,
  type CopilotProposedAction,
} from '@/lib/api'
import { getApiErrorMessage, isApiError } from '@/lib/types/api'
import ZendaLogo from '@/components/zenda/ZendaLogo'
import ZendaButton from '@/components/zenda/ZendaButton'
import ZendaLoader from '@/components/zenda/ZendaLoader'
import ZendaAlert from '@/components/zenda/ZendaAlert'
import LanguageSwitcher from '@/components/LanguageSwitcher'

type ChatRow = CopilotMessage & { failed?: boolean }

function isOfflineError(error: unknown): boolean {
  return !isApiError(error) || !error.response
}

export default function ZendaCopilotPage() {
  const { t, locale } = useLocale()
  const { user, token, checkAuth, isLoading: authLoading } = useAuthStore()
  const [messages, setMessages] = useState<ChatRow[]>([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [stillAnalyzing, setStillAnalyzing] = useState(false)
  const [conversationId, setConversationId] = useState<number | null>(null)
  const [insights, setInsights] = useState<CopilotInsights | null>(null)
  const [insightsError, setInsightsError] = useState('')
  const [history, setHistory] = useState<CopilotConversationListItem[]>([])
  const [historyOpen, setHistoryOpen] = useState(false)
  const [lastPrompt, setLastPrompt] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    void checkAuth()
  }, [checkAuth])

  useEffect(() => {
    if (!token) return
    setInsightsError('')
    aiCopilotApi
      .getInsights(locale)
      .then(setInsights)
      .catch((err) => {
        setInsights(null)
        setInsightsError(isOfflineError(err) ? t('copilot.offline') : getApiErrorMessage(err, t('copilot.analysisFailed')))
      })
  }, [token, locale, t])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, sending])

  const suggestions = insights?.suggested_prompts?.length
    ? insights.suggested_prompts
    : [t('copilot.s1'), t('copilot.s2'), t('copilot.s3'), t('copilot.s4'), t('copilot.s5'), t('copilot.s6'), t('copilot.s7')]

  const sendPrompt = useCallback(
    async (raw: string) => {
      const trimmed = raw.trim()
      if (!trimmed || sending) return
      setLastPrompt(trimmed)
      setInput('')
      setMessages((prev) => [
        ...prev,
        { role: 'user', content: trimmed, created_at: new Date().toISOString() },
      ])
      setSending(true)
      setStillAnalyzing(false)
      const slow = window.setTimeout(() => setStillAnalyzing(true), 8000)
      try {
        const response = await aiCopilotApi.chat(trimmed, conversationId, locale)
        setConversationId(response.conversation_id)
        if (response.assistant_message) {
          const assistant: ChatRow = {
            id: response.assistant_message.id,
            role: response.assistant_message.role || 'assistant',
            content: response.assistant_message.content || '',
            created_at: response.assistant_message.created_at,
            facts: response.assistant_message.facts || response.facts || null,
            proposed_action: response.assistant_message.proposed_action || response.proposed_action || null,
          }
          setMessages((prev) => [...prev, assistant])
        }
      } catch (err) {
        const text = isOfflineError(err) ? t('copilot.offline') : getApiErrorMessage(err, t('copilot.analysisFailed'))
        setMessages((prev) => [...prev, { role: 'assistant', content: text, failed: true }])
      } finally {
        window.clearTimeout(slow)
        setStillAnalyzing(false)
        setSending(false)
      }
    },
    [conversationId, locale, sending, t],
  )

  const loadConversation = async (id: number) => {
    try {
      const data = await aiCopilotApi.getConversation(id)
      setConversationId(id)
      setMessages(data.messages || [])
      setHistoryOpen(false)
    } catch (err) {
      setInsightsError(getApiErrorMessage(err, t('copilot.analysisFailed')))
    }
  }

  const confirmAction = async (action: CopilotProposedAction, confirm: boolean) => {
    if (!conversationId) return
    try {
      const res = await aiCopilotApi.confirmAction(conversationId, action.id, confirm, locale)
      setMessages((prev) => {
        const updated: ChatRow[] = prev.map((item) =>
          item.proposed_action?.id === action.id && item.proposed_action
            ? {
                ...item,
                proposed_action: {
                  ...item.proposed_action,
                  status: confirm ? 'confirmed' : 'cancelled',
                },
              }
            : item,
        )
        if (res.assistant_message) {
          return [
            ...updated,
            {
              ...res.assistant_message,
              role: res.assistant_message.role || 'assistant',
              content: res.assistant_message.content || '',
            },
          ]
        }
        return updated
      })
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: getApiErrorMessage(err, t('copilot.analysisFailed')), failed: true },
      ])
    }
  }

  const copyText = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1500)
    } catch {
      window.prompt(t('copilot.copy'), text)
    }
  }

  const shareText = async (text: string) => {
    if (typeof navigator !== 'undefined' && 'share' in navigator) {
      try {
        await navigator.share({ text, title: t('copilot.title') })
        return
      } catch {
        /* user cancelled or unsupported */
      }
    }
    await copyText(text)
  }

  if (authLoading) {
    return (
      <div className="min-h-screen bg-zenda-deep flex items-center justify-center">
        <ZendaLoader inverse message={t('copilot.analyzing')} size="lg" />
      </div>
    )
  }

  if (!user || !token) {
    return (
      <div className="min-h-screen bg-zenda-deep text-white flex flex-col items-center justify-center px-4">
        <ZendaLogo size="lg" priority />
        <h1 className="mt-6 font-display text-3xl font-bold">{t('copilot.title')}</h1>
        <p className="mt-3 text-white/70 text-center max-w-md">{t('copilot.login')}</p>
        <Link href={`/login?next=/zenda/copilot`} className="btn-zenda mt-8">
          {t('copilot.login')}
        </Link>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#f4f6fb] text-zenda-navy flex flex-col">
      <header className="bg-white border-b border-zenda-border px-4 py-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <ZendaLogo size="sm" />
          <div className="min-w-0">
            <h1 className="font-display font-bold text-lg truncate">{t('copilot.title')}</h1>
            <p className="text-xs text-zenda-textSecondary truncate">{t('copilot.subtitle')}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <LanguageSwitcher variant="product" />
          <ZendaButton
            variant="ghost"
            onClick={() => {
              aiCopilotApi.listConversations().then(setHistory).catch(() => setHistory([]))
              setHistoryOpen(true)
            }}
          >
            {t('copilot.history')}
          </ZendaButton>
          <ZendaButton
            variant="outline"
            onClick={() => {
              setConversationId(null)
              setMessages([])
              setLastPrompt(null)
            }}
          >
            {t('copilot.newChat')}
          </ZendaButton>
        </div>
      </header>

      <main className="flex-1 max-w-3xl w-full mx-auto px-4 py-6 flex flex-col gap-4">
        {insightsError && messages.length === 0 ? (
          <ZendaAlert tone="error">
            <p>{insightsError}</p>
            <button type="button" className="underline font-semibold mt-2" onClick={() => window.location.reload()}>
              {t('copilot.retry')}
            </button>
          </ZendaAlert>
        ) : null}

        {messages.length === 0 && !sending ? (
          <div className="space-y-4">
            {insights?.monthly_report ? (
              <div className="zenda-card p-5">
                <p className="text-sm text-zenda-textSecondary">{insights.monthly_report}</p>
                {insights.health_score != null ? (
                  <p className="mt-2 font-semibold">
                    {t('copilot.health')}: {insights.health_score}/100 ({insights.grade})
                  </p>
                ) : null}
              </div>
            ) : null}
            <p className="text-sm text-zenda-textSecondary">{t('copilot.disclaimer')}</p>
            <p className="font-semibold">{t('copilot.suggestionsTitle')}</p>
            <div className="flex flex-wrap gap-2">
              {suggestions.map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  className="px-3 py-2 rounded-full bg-zenda-container text-sm text-zenda-primary border border-zenda-primary/20 hover:bg-zenda-primary hover:text-white transition"
                  onClick={() => void sendPrompt(prompt)}
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((message, index) => (
              <article
                key={`${message.id ?? 'tmp'}-${index}`}
                className={`rounded-2xl p-4 ${
                  message.role === 'user'
                    ? 'bg-zenda-primary text-white ml-8'
                    : 'bg-white border border-zenda-border mr-8'
                }`}
              >
                <p className="whitespace-pre-wrap leading-relaxed">{message.content}</p>
                {message.created_at ? (
                  <p className={`text-xs mt-2 ${message.role === 'user' ? 'text-white/70' : 'text-zenda-textSecondary'}`}>
                    {new Date(message.created_at).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })}
                  </p>
                ) : null}
                {message.role === 'assistant' ? (
                  <>
                    <FactCards facts={message.facts} t={t} />
                    {message.proposed_action?.status === 'pending' ? (
                      <div className="mt-3 p-3 rounded-xl bg-zenda-container">
                        <p className="text-sm mb-2">{message.proposed_action.summary || t('copilot.actionPending')}</p>
                        <div className="flex gap-2">
                          <ZendaButton variant="success" onClick={() => void confirmAction(message.proposed_action!, true)}>
                            {t('copilot.confirm')}
                          </ZendaButton>
                          <ZendaButton variant="ghost" onClick={() => void confirmAction(message.proposed_action!, false)}>
                            {t('copilot.cancel')}
                          </ZendaButton>
                        </div>
                      </div>
                    ) : null}
                    <div className="flex gap-3 mt-3 text-sm font-semibold text-zenda-primary">
                      <button type="button" onClick={() => void copyText(message.content)}>
                        {copied ? t('copilot.copied') : t('copilot.copy')}
                      </button>
                      <button type="button" onClick={() => void shareText(message.content)}>
                        {t('copilot.share')}
                      </button>
                      {message.failed && lastPrompt ? (
                        <button type="button" onClick={() => void sendPrompt(lastPrompt)}>
                          {t('copilot.retry')}
                        </button>
                      ) : null}
                    </div>
                  </>
                ) : null}
              </article>
            ))}
            {sending ? (
              <div className="bg-white border border-zenda-border rounded-2xl p-4 mr-8">
                <ZendaLoader size="sm" message={stillAnalyzing ? t('copilot.stillAnalyzing') : t('copilot.analyzing')} />
              </div>
            ) : null}
            <div ref={bottomRef} />
          </div>
        )}
      </main>

      <form
        className="max-w-3xl w-full mx-auto px-4 pb-6"
        onSubmit={(event) => {
          event.preventDefault()
          void sendPrompt(input)
        }}
      >
        <div className="flex gap-2">
          <input
            className="zenda-input flex-1"
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder={t('copilot.placeholder')}
            maxLength={2000}
            disabled={sending}
          />
          <ZendaButton type="submit" disabled={!input.trim() || sending}>
            {sending ? t('copilot.analyzing') : t('copilot.send')}
          </ZendaButton>
        </div>
        <p className="text-xs text-zenda-textSecondary mt-2">{t('copilot.disclaimer')}</p>
      </form>

      {historyOpen ? (
        <div className="fixed inset-0 bg-black/40 z-40 flex justify-end" role="dialog" aria-modal="true">
          <div className="bg-white w-full max-w-md h-full p-5 overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="font-display font-bold text-xl">{t('copilot.history')}</h2>
              <ZendaButton variant="ghost" onClick={() => setHistoryOpen(false)}>
                {t('copilot.cancel')}
              </ZendaButton>
            </div>
            {history.length === 0 ? (
              <p className="text-zenda-textSecondary">{t('copilot.emptyHistory')}</p>
            ) : (
              <ul className="space-y-2">
                {history.map((item) => (
                  <li key={item.id}>
                    <button
                      type="button"
                      className="w-full text-left p-3 rounded-xl border border-zenda-border hover:bg-zenda-container"
                      onClick={() => void loadConversation(item.id)}
                    >
                      <p className="font-semibold">{item.title}</p>
                      {item.last_message_preview ? (
                        <p className="text-sm text-zenda-textSecondary mt-1">{item.last_message_preview}</p>
                      ) : null}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      ) : null}
    </div>
  )
}

function FactCards({ facts, t }: { facts?: CopilotFacts | null; t: (key: string) => string }) {
  if (!facts) return null
  if (facts.fx && !facts.fx.error) {
    const fx = facts.fx
    return (
      <div className="mt-3 rounded-xl bg-zenda-container p-3 text-sm">
        <p className="font-bold">
          {fx.original_amount} {fx.original_currency} → {fx.converted_amount} {fx.target_currency}
        </p>
        <p>
          {t('copilot.fxRate')}: 1 {fx.original_currency} = {fx.exchange_rate} {fx.target_currency}
        </p>
        <p>
          {t('copilot.fxSource')}: {fx.source}
        </p>
        <p>
          {t('copilot.fxTime')}: {fx.provider_updated_at || '—'}
        </p>
        <p>{fx.stale ? t('copilot.fxLatest') : t('copilot.fxLive')}</p>
      </div>
    )
  }
  if (facts.income == null && facts.health?.score == null) return null
  return (
    <div className="mt-3 rounded-xl bg-zenda-container p-3 text-sm">
      {facts.income != null ? (
        <p>
          {facts.income} {facts.currency} → {facts.expenses} {facts.currency}
        </p>
      ) : null}
      {facts.health?.score != null ? (
        <p>
          {t('copilot.health')}: {facts.health.score}/100
        </p>
      ) : null}
    </div>
  )
}
