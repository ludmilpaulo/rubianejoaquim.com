'use client'

import { useEffect, useState } from 'react'
import { instructorsApi } from '@/lib/api'

interface Payee {
  payee_name: string
  iban: string
  currency?: string
}

export default function BankPayeeDetails() {
  const [payee, setPayee] = useState<Payee | null>(null)

  useEffect(() => {
    instructorsApi.payee()
      .then((res) => setPayee(res.data as Payee))
      .catch(() => setPayee(null))
  }, [])

  if (!payee?.iban && !payee?.payee_name) return null

  return (
    <div className="space-y-2 text-sm">
      {payee.iban ? (
        <div>
          <span className="font-medium text-gray-700">IBAN:</span>
          <p className="text-gray-900 font-mono mt-1 break-all">{payee.iban}</p>
        </div>
      ) : null}
      {payee.payee_name ? (
        <div>
          <span className="font-medium text-gray-700">Destinatário:</span>
          <p className="text-gray-900 mt-1">{payee.payee_name}</p>
        </div>
      ) : null}
    </div>
  )
}
