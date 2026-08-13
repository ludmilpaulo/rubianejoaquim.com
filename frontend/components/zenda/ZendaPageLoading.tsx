import ZendaLoader from './ZendaLoader'

interface ZendaPageLoadingProps {
  message?: string
}

export default function ZendaPageLoading({ message = 'A carregar…' }: ZendaPageLoadingProps) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-zenda-bg">
      <ZendaLoader message={message} size="lg" />
    </div>
  )
}
