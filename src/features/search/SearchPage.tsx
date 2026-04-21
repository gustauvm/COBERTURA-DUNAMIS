import { Clipboard, MapPin, Phone, Search, Send } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useAppStore } from '../../app/store'
import { inferGroup, type ColaboradorComUnidade } from '../../entities/operational/types'
import { useOperationalData } from '../../entities/operational/hooks'
import { getDutyStatusByTurma } from '../../shared/lib/duty'
import { asString, copyToClipboard, normalizeText } from '../../shared/lib/utils'
import { Badge } from '../../shared/ui/Badge'
import { Card } from '../../shared/ui/Card'
import { EmptyState } from '../../shared/ui/EmptyState'
import { TextInput } from '../../shared/ui/Field'
import { LoadingPanel } from '../../shared/ui/LoadingPanel'

function statusTone(code: string) {
  if (code === 'plantao') return 'warning'
  if (code === 'folga') return 'good'
  return 'neutral'
}

export function SearchPage() {
  const { colaboradoresComUnidade, isLoading, isError } = useOperationalData()
  const { group, globalSearch } = useAppStore()
  const [localSearch, setLocalSearch] = useState('')
  const [status, setStatus] = useState('todos')
  const [selected, setSelected] = useState<ColaboradorComUnidade | null>(null)
  const query = localSearch || globalSearch

  const rows = useMemo(() => {
    const normalizedQuery = normalizeText(query)
    return colaboradoresComUnidade
      .filter((row) => group === 'todos' || inferGroup(row) === group)
      .filter((row) => {
        const duty = getDutyStatusByTurma(row.turma).code
        return status === 'todos' || duty === status
      })
      .filter((row) => !normalizedQuery || row.searchText.includes(normalizedQuery) || normalizeText(row.unidade?.searchText).includes(normalizedQuery))
      .slice(0, 80)
  }, [colaboradoresComUnidade, group, query, status])

  if (isLoading) return <LoadingPanel />
  if (isError) return <EmptyState title="Falha ao carregar Supabase" detail="Confira conexão, RLS e tabelas colaboradores/unidades." />

  return (
    <div className="split-layout">
      <section className="primary-panel">
        <div className="section-head">
          <div>
            <span className="eyebrow">Busca operacional</span>
            <h2>Encontrar cobertura em segundos</h2>
          </div>
          <Badge tone="info">{rows.length} resultados</Badge>
        </div>
        <div className="toolbar-grid">
          <div className="search-control"><Search size={18} /><TextInput value={localSearch} onChange={(event) => setLocalSearch(event.target.value)} placeholder="Nome, matrícula, RE, posto, cargo, telefone..." /></div>
          <select className="control" value={status} onChange={(event) => setStatus(event.target.value)}>
            <option value="todos">Todos os status</option>
            <option value="plantao">Plantão</option>
            <option value="folga">Folga</option>
            <option value="indefinido">Sem turma</option>
          </select>
        </div>

        <div className="result-list">
          {rows.map((row) => {
            const duty = getDutyStatusByTurma(row.turma)
            return (
              <button key={`${row.matricula}-${row.re}-${row.nome}`} className="person-row" onClick={() => setSelected(row)}>
                <div className="avatar">{row.nome.slice(0, 1) || '?'}</div>
                <div>
                  <strong>{row.nome || 'Sem nome'}</strong>
                  <span>{[row.matricula, row.re, row.cargo].filter(Boolean).join(' • ')}</span>
                  <small>{[row.posto, row.escala, row.turno, row.telefone].filter(Boolean).join(' • ')}</small>
                </div>
                <Badge tone={statusTone(duty.code)}>{duty.label}</Badge>
              </button>
            )
          })}
        </div>
      </section>

      <aside className="detail-panel">
        {selected ? <PersonDetail row={selected} /> : <EmptyState title="Selecione um colaborador" detail="O painel mostra contato, posto, unidade vinculada e dados brutos úteis para operação." />}
      </aside>
    </div>
  )
}

function PersonDetail({ row }: { row: ColaboradorComUnidade }) {
  const duty = getDutyStatusByTurma(row.turma)
  const contact = asString(row.telefone)
  const mapsUrl = row.unidade?.endereco ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(row.unidade.endereco)}` : ''
  const summary = `${row.nome}\nMatrícula: ${row.matricula}\nRE: ${row.re}\nPosto: ${row.posto}\nCargo: ${row.cargo}\nTelefone: ${row.telefone}\nStatus: ${duty.label}`
  return (
    <div className="detail-stack">
      <div className="detail-hero">
        <div className="avatar large">{row.nome.slice(0, 1) || '?'}</div>
        <div><h3>{row.nome}</h3><p>{row.cargo}</p></div>
        <Badge tone={statusTone(duty.code)}>{duty.label}</Badge>
      </div>
      <div className="action-row">
        <button onClick={() => void copyToClipboard(summary)}><Clipboard size={16} /> Copiar</button>
        {contact ? <a href={`tel:${contact}`}><Phone size={16} /> Ligar</a> : null}
        {contact ? <a href={`https://wa.me/55${contact.replace(/\D/g, '')}`} target="_blank"><Send size={16} /> WhatsApp</a> : null}
        {mapsUrl ? <a href={mapsUrl} target="_blank"><MapPin size={16} /> Mapa</a> : null}
      </div>
      <InfoGrid rows={[
        ['Matrícula', row.matricula], ['RE', row.re], ['Posto', row.posto], ['Escala', row.escala], ['Turno', row.turno], ['Turma', row.turma], ['Empresa', row.empresa], ['Telefone', row.telefone],
      ]} />
      <Card className="compact-card"><h4>Unidade vinculada</h4><InfoGrid rows={[[ 'Posto', row.unidade?.posto ], [ 'Cliente', row.unidade?.cliente ], [ 'Endereço', row.unidade?.endereco ], [ 'Cidade', row.unidade?.cidade ], [ 'E-mail', row.unidade?.email ]]} /></Card>
      <Card className="compact-card"><h4>Dados brutos</h4><pre className="raw-box">{JSON.stringify(row, null, 2)}</pre></Card>
    </div>
  )
}

function InfoGrid({ rows }: { rows: Array<[string, unknown]> }) {
  return <div className="info-grid">{rows.filter(([, value]) => asString(value)).map(([label, value]) => <div key={label}><span>{label}</span><strong>{asString(value)}</strong></div>)}</div>
}
