import type { Metadata } from 'next'
import AuthGuard from '@/components/AuthGuard'

export const metadata: Metadata = {
  title: 'Dashboard Admin | Rubiane Joaquim Educação Financeira',
  description: 'Painel de administração para gerir cursos, matrículas e mentoria.',
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
