import { Building2, Clipboard, MapPin, Search, Users } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useAppStore } from '../../app/store'
import { useOperationalData } from '../../entities/operational/hooks'
import { inferGroup, type Unidade } from '../../entities/operational/types'
import { asString, copyToClipboard, normalizeText } from '../../shared/lib/utils'
import { Badge } from '../../shared/ui/Badge'
import { Card } from '../../shared/ui/Card'
import { EmptyState } from '../../shared/ui/EmptyState'
import { TextInput } from '../../shared/ui/Field'
import { LoadingPanel } from '../../shared/ui/LoadingPanel'

export function UnitsPage() {
  const { unidades, colaboradoresComUnidade, isLoading } = useOperationalData()
  const { group, globalSearch } = useAppStore()
  const [localSearch, setLocalSearch] = useState('')
  const [selected, setSelected] = useState<Unidade | null>(null)
  const query = normalizeText(localSearch || globalSearch)

  const rows = useMemo(() => {
    return unidades
      .filter((unit) => group === 'todos' || inferGroup(unit) === group)
      .filter((unit) => !query || unit.searchText.includes(query))
      .slice(0, 100)
  }, [group, query, unidades])

  const linked = useMemo(() => {
    if (!selected) return []
    return colaboradoresComUnidade.filter((row) => normalizeText(row.posto) === normalizeText(selected.posto))
  }, [colaboradoresComUnidade, selected])

  if (isLoading) return <LoadingPanel />

  return (
    <div className="split-layout">
      <section className="primary-panel">
        <div className="section-head">
          <div><span className="eyebrow">Diretório operacional</span><h2>Unidades e postos</h2></div>
          <Badge tone="info">{rows.length} unidades</Badge>
        </div>
        <div className="search-control"><Search size={18} /><TextInput value={localSearch} onChange={(event) => setLocalSearch(event.target.value)} placeholder="Posto, cliente, empresa, cidade, e-mail..." /></div>
        <div className="unit-grid">
          {rows.map((unit) => (
            <button key={`${unit.posto}-${unit.cliente}`} className="unit-card" onClick={() => setSelected(unit)}>
              <Building2 size={20} />
              <strong>{unit.posto || unit.cliente || 'Unidade sem nome'}</strong>
              <span>{[unit.cliente, unit.empresa].filter(Boolean).join(' • ')}</span>
              <small>{[unit.endereco, unit.cidade].filter(Boolean).join(' • ')}</small>
            </button>
          ))}
        </div>
      </section>
      <aside className="detail-panel">
        {selected ? <UnitDetail unit={selected} linkedCount={linked.length} linkedNames={linked.slice(0, 10).map((row) => row.nome)} /> : <EmptyState title="Selecione uma unidade" detail="Veja contatos, endereço e colaboradores vinculados pelo posto." />}
      </aside>
    </div>
  )
}

function UnitDetail({ unit, linkedCount, linkedNames }: { unit: Unidade; linkedCount: number; linkedNames: string[] }) {
  const mapsUrl = unit.endereco ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(unit.endereco)}` : ''
  const summary = [unit.posto, unit.cliente, unit.empresa, unit.endereco, unit.email].filter(Boolean).join('\n')
  return (
    <div className="detail-stack">
      <div className="detail-hero"><div className="avatar large"><Building2 size={24} /></div><div><h3>{unit.posto || unit.cliente}</h3><p>{unit.cliente}</p></div><Badge tone="info">{linkedCount} pessoas</Badge></div>
      <div className="action-row">
        <button onClick={() => void copyToClipboard(summary)}><Clipboard size={16} /> Copiar</button>
        {mapsUrl ? <a href={mapsUrl} target="_blank"><MapPin size={16} /> Mapa</a> : null}
      </div>
      <div className="info-grid">
        {[['Posto', unit.posto], ['Cliente', unit.cliente], ['Empresa', unit.empresa], ['Unidade negócio', unit.unidadeNegocio], ['Endereço', unit.endereco], ['Cidade', unit.cidade], ['Estado', unit.estado], ['E-mail', unit.email]].filter(([, value]) => asString(value)).map(([label, value]) => <div key={label}><span>{label}</span><strong>{asString(value)}</strong></div>)}
      </div>
      <Card className="compact-card"><h4><Users size={16} /> Colaboradores vinculados</h4>{linkedNames.length ? <ul className="name-list">{linkedNames.map((name) => <li key={name}>{name}</li>)}</ul> : <p>Nenhum vínculo pelo posto.</p>}</Card>
      <Card className="compact-card"><h4>Dados brutos</h4><pre className="raw-box">{JSON.stringify(unit, null, 2)}</pre></Card>
    </div>
  )
}
