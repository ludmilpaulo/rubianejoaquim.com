import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Redefinir Palavra-passe | Rubiane Joaquim Educação Financeira',
  description: 'Defina uma nova palavra-passe para a sua conta na plataforma de educação financeira Rubiane Joaquim.',
  robots: { index: false, follow: true },
}

export default function ResetPasswordLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
