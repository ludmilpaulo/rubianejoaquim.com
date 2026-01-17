import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Conteúdos Grátis de Educação Financeira | Rubiane Joaquim',
  description: 'Aulas e conteúdos gratuitos de educação financeira com Rubiane Joaquim. Aprenda a poupar e investir. Conheça o método antes de investir nos cursos.',
  keywords: ['educação financeira grátis', 'aula finanças pessoais', 'conteúdo financeiro gratuito', 'Rubiane Joaquim grátis', 'literacia financeira gratuita'],
  openGraph: {
    title: 'Conteúdos Grátis de Educação Financeira | Rubiane Joaquim',
    description: 'Aulas gratuitas de educação financeira. Conheça o método de Rubiane Joaquim antes de investir nos cursos completos.',
    url: '/conteudos-gratis',
  },
}

export default function ConteudosGratisLayout({ children }: { children: React.ReactNode }) {
  return children
}
