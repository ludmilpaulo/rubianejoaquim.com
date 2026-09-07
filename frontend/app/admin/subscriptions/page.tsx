'use client'

import { Suspense } from 'react'
import SubscriptionsDashboard from '@/components/admin/subscriptions/SubscriptionsDashboard'

export default function AdminSubscriptionsPage() {
  return (
    <Suspense fallback={null}>
      <SubscriptionsDashboard />
    </Suspense>
  )
}
