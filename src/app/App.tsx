import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useAppStore } from './store'
import { useOperationalRealtime } from '../entities/operational/hooks'
import { useFormalizadorRealtime } from '../entities/formalizador/hooks'
import { GatewayPage } from '../features/gateway/GatewayPage'
import { SearchPage } from '../features/search/SearchPage'
import { UnitsPage } from '../features/units/UnitsPage'
import { FormalizerPage } from '../features/formalizer/FormalizerPage'
import { AppShell } from '../widgets/app-shell/AppShell'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
})

function Router() {
  const section = useAppStore((state) => state.section)
  useOperationalRealtime()
  useFormalizadorRealtime()

  return (
    <AppShell>
      {section === 'home' ? <GatewayPage /> : null}
      {section === 'busca' ? <SearchPage /> : null}
      {section === 'unidades' ? <UnitsPage /> : null}
      {section === 'formalizador' ? <FormalizerPage /> : null}
    </AppShell>
  )
}

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router />
    </QueryClientProvider>
  )
}
