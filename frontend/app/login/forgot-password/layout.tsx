import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Esqueceu a Palavra-passe | Rubiane Joaquim Educação Financeira',
  description: 'Redefina a sua palavra-passe na plataforma de educação financeira Rubiane Joaquim.',
  robots: { index: false, follow: true },
}

export default function ForgotPasswordLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
