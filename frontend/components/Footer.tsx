import Link from 'next/link'

export default function Footer() {
  return (
    <footer className="bg-gray-900 text-white mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <h3 className="text-xl font-bold mb-4">Erica Educação Financeira</h3>
            <p className="text-gray-400">
              Transforme a sua relação com o dinheiro através de cursos e mentoria personalizada.
            </p>
          </div>
          <div>
            <h4 className="font-semibold mb-4">Links</h4>
            <ul className="space-y-2 text-gray-400">
              <li>
                <Link href="/cursos" className="hover:text-white">Cursos</Link>
              </li>
              <li>
                <Link href="/mentoria" className="hover:text-white">Mentoria</Link>
              </li>
              <li>
                <Link href="/conteudos-gratis" className="hover:text-white">Conteúdos Grátis</Link>
              </li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold mb-4">Contacto</h4>
            <p className="text-gray-400">
              Email: contacto@ericaeducacao.com
            </p>
          </div>
        </div>
        <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
          <p>&copy; {new Date().getFullYear()} Erica Educação Financeira. Todos os direitos reservados.</p>
        </div>
      </div>
    </footer>
  )
}
