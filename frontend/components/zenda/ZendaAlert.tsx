import type { ReactNode } from 'react'

type Tone = 'error' | 'warning' | 'success' | 'info'

const TONE: Record<Tone, string> = {
  error: 'zenda-alert-error',
  warning: 'zenda-alert-warning',
  success: 'zenda-alert-success',
  info: 'bg-zenda-container border border-zenda-primary/20 text-zenda-navy rounded-xl px-4 py-3',
}

interface ZendaAlertProps {
  tone?: Tone
  children: ReactNode
  className?: string
}

export default function ZendaAlert({ tone = 'info', children, className = '' }: ZendaAlertProps) {
  return <div className={`${TONE[tone]} ${className}`.trim()}>{children}</div>
}
