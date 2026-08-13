import type { HTMLAttributes, ReactNode } from 'react'

interface ZendaCardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode
}

export default function ZendaCard({ children, className = '', ...rest }: ZendaCardProps) {
  return (
    <div className={`zenda-card p-4 sm:p-6 ${className}`.trim()} {...rest}>
      {children}
    </div>
  )
}
