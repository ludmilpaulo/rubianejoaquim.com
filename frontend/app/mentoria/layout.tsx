import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Mentoria em Educação Financeira | Rubiane Joaquim',
  description: 'Mentoria personalizada em educação financeira com Rubiane Joaquim. Acompanhamento individual para poupar, investir e alcançar os seus objetivos financeiros em Portugal.',
  keywords: ['mentoria financeira', 'mentoria investimentos', 'consultoria finanças pessoais', 'Rubiane Joaquim mentoria', 'acompanhamento financeiro'],
  openGraph: {
    title: 'Mentoria em Educação Financeira | Rubiane Joaquim',
    description: 'Mentoria personalizada em educação financeira. Acompanhamento individual com Rubiane Joaquim para os seus objetivos financeiros.',
    url: '/mentoria',
  },
}

export default function MentoriaLayout({ children }: { children: React.ReactNode }) {
  return children
}
