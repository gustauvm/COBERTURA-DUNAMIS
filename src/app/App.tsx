import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useOperationalRealtime } from '../entities/operational/hooks'
import { SearchPage } from '../features/search/SearchPage'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 60_000,
    },
  },
})

function SearchOnlyApp() {
  useOperationalRealtime()
  return <SearchPage />
}

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <SearchOnlyApp />
    </QueryClientProvider>
  )
}
