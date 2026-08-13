import type { InputHTMLAttributes } from 'react'

interface ZendaInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
}

export default function ZendaInput({ label, className = '', id, ...rest }: ZendaInputProps) {
  return (
    <div>
      {label ? (
        <label htmlFor={id} className="block text-sm font-medium text-zenda-navy mb-2">
          {label}
        </label>
      ) : null}
      <input id={id} className={`zenda-input ${className}`.trim()} {...rest} />
    </div>
  )
}
