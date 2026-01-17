import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Entrar | Rubiane Joaquim Educação Financeira',
  description: 'Aceda à sua conta na plataforma de educação financeira Rubiane Joaquim. Cursos, mentoria e área do aluno.',
  robots: { index: false, follow: true },
}

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return children
}
