import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Solicitar Exclusão de Conta | Zenda - Educação Financeira',
  description: 'Solicite a exclusão da sua conta e dados associados no Zenda. Informações sobre dados excluídos, período de retenção de 30 dias e processo de exclusão. Desenvolvedor: Rubiane Joaquim Educação Financeira.',
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    title: 'Solicitar Exclusão de Conta | Zenda',
    description: 'Solicite a exclusão da sua conta e dados associados no Zenda.',
    type: 'website',
  },
}

export default function DeleteAccountLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
