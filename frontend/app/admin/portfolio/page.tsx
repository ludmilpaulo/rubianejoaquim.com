'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/lib/store'
import { adminApi } from '@/lib/api'

interface ContactMessageRow {
  id: number
  name: string
  email: string
  subject: string
  status: string
  created_at: string
}

export default function AdminPortfolioPage() {
  const { user, checkAuth, isLoading } = useAuthStore()
  const router = useRouter()
  const [messages, setMessages] = useState<ContactMessageRow[]>([])
  const [projectCount, setProjectCount] = useState(0)

  useEffect(() => {
    checkAuth()
  }, [checkAuth])

  useEffect(() => {
    if (!isLoading && (!user || !user.is_admin)) {
      router.push('/login')
    }
  }, [user, isLoading, router])

  useEffect(() => {
    if (!user?.is_admin) return
    Promise.all([
      adminApi.portfolio.contactMessages.list(),
      adminApi.portfolio.projects.list(),
    ])
      .then(([msgRes, projRes]) => {
        const msgData = msgRes.data as { results?: ContactMessageRow[] } | ContactMessageRow[]
        setMessages(Array.isArray(msgData) ? msgData : msgData.results ?? [])
        const projData = projRes.data as { results?: unknown[] } | unknown[]
        setProjectCount(Array.isArray(projData) ? projData.length : (projData.results?.length ?? 0))
      })
      .catch(() => {})
  }, [user])

  if (isLoading || !user?.is_admin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin w-8 h-8 border-2 border-primary-600 border-t-transparent rounded-full" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Portfolio CMS</h1>
          <Link href="/admin" className="text-primary-600 hover:underline text-sm">
            ← Admin
          </Link>
        </div>
        <p className="text-gray-600 mb-6">
          Manage portfolio content in Django Admin ({' '}
          <code className="text-sm bg-gray-100 px-1 rounded">/admin/portfolio/</code>
          ) or via API. Projects in API: {projectCount}.
        </p>
        <div className="grid sm:grid-cols-2 gap-4 mb-10">
          {[
            ['Projects', '/admin/portfolio/portfolioproject/'],
            ['Services', '/admin/portfolio/service/'],
            ['Testimonials', '/admin/portfolio/testimonial/'],
            ['Showreel', '/admin/portfolio/showreelvideo/'],
            ['Case Studies', '/admin/portfolio/casestudy/'],
            ['Zenda Content', '/admin/portfolio/zendacontent/'],
            ['Home Sections', '/admin/portfolio/homesection/'],
            ['Contact Messages', '#messages'],
          ].map(([label, path]) => (
            <a
              key={label}
              href={path.startsWith('#') ? path : `${process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || ''}${path}`}
              className="p-4 bg-white rounded-xl border border-gray-200 hover:border-primary-300 transition-colors"
              {...(path.startsWith('#') ? {} : { target: '_blank', rel: 'noopener noreferrer' })}
            >
              <span className="font-medium text-gray-900">{label}</span>
            </a>
          ))}
        </div>
        <h2 id="messages" className="text-lg font-semibold text-gray-900 mb-4">
          Recent contact messages
        </h2>
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Subject</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Date</th>
              </tr>
            </thead>
            <tbody>
              {messages.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-gray-500">
                    No messages yet
                  </td>
                </tr>
              ) : (
                messages.slice(0, 20).map((m) => (
                  <tr key={m.id} className="border-t border-gray-100">
                    <td className="px-4 py-3">{m.name}</td>
                    <td className="px-4 py-3">{m.subject}</td>
                    <td className="px-4 py-3 capitalize">{m.status}</td>
                    <td className="px-4 py-3 text-gray-500">
                      {new Date(m.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
