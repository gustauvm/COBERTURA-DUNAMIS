import { Bell, Building2, FileText, Home, Search, ShieldCheck } from 'lucide-react'
import { useAppStore, type AppSection } from '../../app/store'
import { groupRules } from '../../entities/operational/types'
import { useOperationalData } from '../../entities/operational/hooks'
import { cn } from '../../shared/lib/utils'
import { TextInput } from '../../shared/ui/Field'

const nav: { key: AppSection; label: string; icon: typeof Home }[] = [
  { key: 'home', label: 'Central', icon: Home },
  { key: 'busca', label: 'Busca', icon: Search },
  { key: 'unidades', label: 'Unidades', icon: Building2 },
  { key: 'formalizador', label: 'Formalizador', icon: FileText },
]

export function AppShell({ children }: { children: React.ReactNode }) {
  const { section, setSection, group, setGroup, globalSearch, setGlobalSearch } = useAppStore()
  const { colaboradores, unidades, isLoading } = useOperationalData()

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand-lockup">
          <div className="brand-mark">DP</div>
          <div>
            <strong>Dunamis Pro</strong>
            <span>V5 Operational OS</span>
          </div>
        </div>

        <nav className="nav-stack" aria-label="Navegação principal">
          {nav.map((item) => {
            const Icon = item.icon
            return (
              <button key={item.key} className={cn('nav-item', section === item.key && 'active')} onClick={() => setSection(item.key)}>
                <Icon size={18} />
                <span>{item.label}</span>
              </button>
            )
          })}
        </nav>

        <div className="sidebar-panel">
          <span className="eyebrow">Base ativa</span>
          <strong>{colaboradores.length.toLocaleString('pt-BR')} colaboradores</strong>
          <small>{unidades.length.toLocaleString('pt-BR')} unidades vinculáveis</small>
        </div>
      </aside>

      <main className="workspace">
        <header className="topbar">
          <div>
            <span className="eyebrow">Centro operacional público</span>
            <h1>{nav.find((item) => item.key === section)?.label ?? 'Central'}</h1>
          </div>
          <div className="command-strip">
            <TextInput value={globalSearch} onChange={(event) => setGlobalSearch(event.target.value)} placeholder="Buscar pessoa, posto, telefone, protocolo..." />
            <button className="icon-button" title="Monitoramento Supabase">
              <Bell size={18} />
            </button>
          </div>
        </header>

        <section className="group-rail" aria-label="Filtro por empresa">
          {groupRules.map((item) => (
            <button key={item.key} className={cn('group-chip', group === item.key && 'active')} onClick={() => setGroup(item.key)}>
              {item.logo ? <img src={item.logo} alt="" /> : <ShieldCheck size={16} />}
              <span>{item.label}</span>
            </button>
          ))}
        </section>

        {isLoading ? <div className="sync-banner">Sincronizando Supabase em tempo real...</div> : null}
        {children}
      </main>
    </div>
  )
}
