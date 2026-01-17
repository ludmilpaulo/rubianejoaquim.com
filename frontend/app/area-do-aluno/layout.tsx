import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Área do Aluno | Rubiane Joaquim Educação Financeira',
  description: 'Aceda aos seus cursos, aulas e progresso na plataforma de educação financeira Rubiane Joaquim. Conteúdos e mentoria.',
  robots: { index: false, follow: true },
}

export default function AreaDoAlunoLayout({ children }: { children: React.ReactNode }) {
  return children
}
