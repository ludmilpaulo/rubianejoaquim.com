import type { Metadata } from 'next'
import AuthGuard from '@/components/AuthGuard'

export const metadata: Metadata = {
  title: 'Área do Aluno | Rubiane Joaquim Educação Financeira',
  description: 'Aceda aos seus cursos, aulas e progresso na plataforma de educação financeira Rubiane Joaquim. Conteúdos e mentoria.',
  robots: { index: false, follow: true },
}

export default function AreaDoAlunoLayout({ children }: { children: React.ReactNode }) {
  return <AuthGuard>{children}</AuthGuard>
}
