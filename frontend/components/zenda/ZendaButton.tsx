import type { ButtonHTMLAttributes, ReactNode } from 'react'

type Variant = 'primary' | 'secondary' | 'success' | 'danger' | 'outline' | 'ghost'

const VARIANT: Record<Variant, string> = {
  primary:
    'bg-zenda-primary text-white hover:bg-zenda-light shadow-lg shadow-zenda-dark/20 hover:-translate-y-0.5',
  secondary:
    'bg-zenda-container text-zenda-primary hover:bg-zenda-primary hover:text-white',
  success:
    'bg-zenda-growth text-white hover:bg-zenda-growthDark shadow-lg shadow-zenda-dark/10 hover:-translate-y-0.5',
  danger:
    'bg-zenda-expense text-white hover:opacity-90',
  outline:
    'border-2 border-zenda-primary/30 text-zenda-primary hover:bg-zenda-container bg-transparent',
  ghost:
    'text-zenda-primary hover:bg-zenda-container bg-transparent',
}

interface ZendaButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  children: ReactNode
}

export default function ZendaButton({
  variant = 'primary',
  className = '',
  type = 'button',
  disabled,
  children,
  ...rest
}: ZendaButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled}
      className={`inline-flex items-center justify-center gap-2 min-h-[44px] px-6 py-3 rounded-xl font-semibold transition-all duration-300 disabled:opacity-50 disabled:pointer-events-none disabled:translate-y-0 ${VARIANT[variant]} ${className}`.trim()}
      {...rest}
    >
      {children}
    </button>
  )
}
