import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Cursos de Educação Financeira | Rubiane Joaquim',
  description: 'Cursos online de educação financeira com Rubiane Joaquim. Aprenda a poupar, investir e alcançar liberdade financeira. Formação prática em Portugal.',
  keywords: ['curso educação financeira', 'curso finanças pessoais', 'formação financeira online', 'Rubiane Joaquim curso', 'literacia financeira Portugal'],
  openGraph: {
    title: 'Cursos de Educação Financeira | Rubiane Joaquim',
    description: 'Cursos online de educação financeira. Formação prática em poupança, investimentos e liberdade financeira com Rubiane Joaquim.',
    url: '/cursos',
  },
}

export default function CursosLayout({ children }: { children: React.ReactNode }) {
  return children
}
