import type { Metadata } from 'next'
import AuthGuard from '@/components/AuthGuard'

export const metadata: Metadata = {
  title: 'Painel Admin | Rubiane Joaquim',
  description: 'Consola profissional para gerir cursos, matrículas, CMS, pagamentos e a app Zenda.',
  robots: {
    index: false,
    follow: false,
  },
}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <AuthGuard requireAdmin>{children}</AuthGuard>
}
