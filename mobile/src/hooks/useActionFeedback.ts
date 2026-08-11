import { useCallback, useRef, useState } from 'react'
import { useAlert } from './useAlert'
import { useI18n } from '../contexts/I18nContext'
import { getApiErrorMessage } from '../types/api'

export type ActionPendingKey = string

export interface ActionFeedbackOptions {
  /** Unique key so multiple CTAs on one screen can track independently. Default: `default`. */
  pendingKey?: ActionPendingKey
  /** i18n key shown while in flight (optional UI label). */
  pendingMessage?: string
  /** i18n key or raw message for success toast. Omit to skip success alert. */
  successMessage?: string | false
  /** i18n key fallback for API/network errors. */
  errorFallback?: string
  /** Skip success alert even if successMessage is set. */
  silentSuccess?: boolean
  /** Skip error alert (caller handles). */
  silentError?: boolean
  onSuccess?: () => void
  onError?: (error: unknown) => void
}

export interface ActionFeedbackApi {
  /** Run an async action with loading lock, success/error toasts, and double-submit prevention. */
  run: <T>(asyncFn: () => Promise<T>, options?: ActionFeedbackOptions) => Promise<T | undefined>
  /** True while the given key (or default) is in flight. */
  isPending: (key?: ActionPendingKey) => boolean
  /** True if any keyed action is in flight. */
  anyPending: boolean
  /** Current pending i18n key (if set by the active run). */
  pendingMessageKey: string | null
  /** Resolved label for the active pending message. */
  pendingLabel: string | undefined
  /** Convenience: Paper Button props for a pending key. */
  buttonProps: (key?: ActionPendingKey) => { loading: boolean; disabled: boolean }
  /** Label helper: pending text or idle text. */
  actionLabel: (idleKey: string, pendingKey?: ActionPendingKey, pendingMessageKey?: string) => string
}

/**
 * Application-wide action feedback: loading lock, double-submit prevention,
 * success/error alerts via useAlert, always clears loading in finally.
 */
export function useActionFeedback(): ActionFeedbackApi {
  const alert = useAlert()
  const { t } = useI18n()
  const [pending, setPending] = useState<Record<string, boolean>>({})
  const [pendingMessageKey, setPendingMessageKey] = useState<string | null>(null)
  const inFlight = useRef<Set<string>>(new Set())

  const isPending = useCallback(
    (key: ActionPendingKey = 'default') => Boolean(pending[key]),
    [pending],
  )

  const anyPending = Object.values(pending).some(Boolean)

  const setKeyPending = useCallback((key: string, value: boolean, messageKey?: string) => {
    setPending((prev) => {
      if (value) return { ...prev, [key]: true }
      const next = { ...prev }
      delete next[key]
      return next
    })
    if (value && messageKey) {
      setPendingMessageKey(messageKey)
    } else if (!value) {
      setPendingMessageKey((current) => (current === messageKey || !messageKey ? null : current))
    }
  }, [])

  const run = useCallback(
    async <T>(asyncFn: () => Promise<T>, options?: ActionFeedbackOptions): Promise<T | undefined> => {
      const key = options?.pendingKey ?? 'default'
      if (inFlight.current.has(key)) {
        return undefined
      }
      inFlight.current.add(key)
      setKeyPending(key, true, options?.pendingMessage)

      try {
        const result = await asyncFn()
        if (options?.successMessage && !options.silentSuccess) {
          alert.success(options.successMessage)
        }
        options?.onSuccess?.()
        return result
      } catch (error: unknown) {
        if (!options?.silentError) {
          alert.error(getApiErrorMessage(error, options?.errorFallback ?? 'feedback.tryAgain'))
        }
        options?.onError?.(error)
        return undefined
      } finally {
        inFlight.current.delete(key)
        setKeyPending(key, false, options?.pendingMessage)
      }
    },
    [alert, setKeyPending],
  )

  const buttonProps = useCallback(
    (key: ActionPendingKey = 'default') => ({
      loading: isPending(key),
      disabled: isPending(key),
    }),
    [isPending],
  )

  const actionLabel = useCallback(
    (idleKey: string, key: ActionPendingKey = 'default', pendingMsg = 'feedback.saving') =>
      isPending(key) ? t(pendingMsg) : t(idleKey),
    [isPending, t],
  )

  return {
    run,
    isPending,
    anyPending,
    pendingMessageKey,
    pendingLabel: pendingMessageKey ? t(pendingMessageKey) : undefined,
    buttonProps,
    actionLabel,
  }
}
