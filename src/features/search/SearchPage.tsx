import {
  Building2,
  CheckCircle2,
  Clipboard,
  Filter,
  MapPin,
  MessageCircle,
  Phone,
  RotateCcw,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  UserRound,
} from 'lucide-react'
import { useEffect, useMemo } from 'react'
import { useAppStore, type SearchGroup, type SearchSort, type SearchStatusFilter } from '../../app/store'
import { useOperationalData } from '../../entities/operational/hooks'
import { groupRules, inferGroup, type ColaboradorComUnidade } from '../../entities/operational/types'
import { getDutyStatusByTurma } from '../../shared/lib/duty'
import { asString, copyToClipboard, formatDate, normalizeText } from '../../shared/lib/utils'
import { EmptyState } from '../../shared/ui/EmptyState'
import { LoadingPanel } from '../../shared/ui/LoadingPanel'

type ScoredRow = {
  row: ColaboradorComUnidade
  score: number
}

const resultLimit = 140

function personKey(row: ColaboradorComUnidade) {
  return `${row.matricula || row.re || row.nome}|${row.posto}`
}

function statusLabel(code: string) {
  if (code === 'plantao') return 'Plantão'
  if (code === 'folga') return 'Folga'
  return 'Sem turma'
}

function statusClass(code: string) {
  if (code === 'plantao') return 'status-plantao'
  if (code === 'folga') return 'status-folga'
  return 'status-indefinido'
}

function uniqueSorted(values: string[]) {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean))).sort((a, b) => a.localeCompare(b, 'pt-BR')).slice(0, 120)
}

function searchableUnit(row: ColaboradorComUnidade) {
  return [row.unidade?.posto, row.unidade?.cliente, row.unidade?.empresa, row.unidade?.unidadeNegocio, row.unidade?.endereco, row.unidade?.cidade, row.unidade?.email].filter(Boolean).join(' ')
}

function scoreRow(row: ColaboradorComUnidade, query: string) {
  const terms = normalizeText(query).split(/\s+/).filter(Boolean)
  if (!terms.length) return 1

  const weighted = [
    { value: row.nome, weight: 90 },
    { value: row.matricula, weight: 85 },
    { value: row.re, weight: 82 },
    { value: row.posto, weight: 70 },
    { value: row.cargo, weight: 52 },
    { value: row.telefone, weight: 50 },
    { value: row.escala, weight: 34 },
    { value: row.turno, weight: 32 },
    { value: row.empresa, weight: 28 },
    { value: row.unidadeNegocio, weight: 26 },
    { value: searchableUnit(row), weight: 24 },
    { value: row.searchText, weight: 8 },
  ].map((part) => ({ ...part, normalized: normalizeText(part.value) }))

  let score = 0
  for (const term of terms) {
    let matched = false
    for (const part of weighted) {
      if (!part.normalized) continue
      if (part.normalized === term) {
        score += part.weight + 35
        matched = true
      } else if (part.normalized.startsWith(term)) {
        score += part.weight + 14
        matched = true
      } else if (part.normalized.includes(term)) {
        score += part.weight
        matched = true
      }
    }
    if (!matched) return 0
  }
  return score
}

function highlight(value: unknown, query: string) {
  const text = asString(value)
  const terms = normalizeText(query).split(/\s+/).filter((term) => term.length >= 2)
  if (!text || !terms.length) return text
  const normalized = normalizeText(text)
  const term = terms.find((candidate) => normalized.includes(candidate))
  if (!term) return text
  const start = normalized.indexOf(term)
  if (start < 0) return text
  const end = start + term.length
  return <>{text.slice(0, start)}<mark>{text.slice(start, end)}</mark>{text.slice(end)}</>
}

function buildSummary(row: ColaboradorComUnidade) {
  const duty = getDutyStatusByTurma(row.turma)
  return [
    row.nome,
    row.matricula ? `Matrícula: ${row.matricula}` : '',
    row.re ? `RE: ${row.re}` : '',
    row.posto ? `Posto: ${row.posto}` : '',
    row.cargo ? `Cargo: ${row.cargo}` : '',
    row.escala ? `Escala: ${row.escala}` : '',
    row.turno ? `Turno: ${row.turno}` : '',
    row.turma ? `Turma: ${row.turma}` : '',
    row.telefone ? `Telefone: ${row.telefone}` : '',
    `Status: ${duty.label}`,
  ].filter(Boolean).join('\n')
}

function groupResults(rows: ScoredRow[], groupBy: SearchGroup) {
  if (groupBy === 'none') return [{ label: 'Resultados operacionais', rows }]
  const map = new Map<string, ScoredRow[]>()
  for (const entry of rows) {
    const duty = getDutyStatusByTurma(entry.row.turma)
    const label = groupBy === 'posto' ? entry.row.posto || 'Sem posto' : groupBy === 'status' ? statusLabel(duty.code) : entry.row.escala || 'Sem escala'
    map.set(label, [...(map.get(label) ?? []), entry])
  }
  return Array.from(map.entries())
    .sort(([a], [b]) => a.localeCompare(b, 'pt-BR'))
    .map(([label, groupedRows]) => ({ label, rows: groupedRows }))
}

export function SearchPage() {
  const { colaboradoresComUnidade, isLoading, isError, error } = useOperationalData()
  const {
    group,
    search,
    status,
    cargo,
    escala,
    turno,
    turma,
    sort,
    groupBy,
    selectedKey,
    setGroup,
    setSearch,
    setStatus,
    setCargo,
    setEscala,
    setTurno,
    setTurma,
    setSort,
    setGroupBy,
    setSelectedKey,
    resetFilters,
  } = useAppStore()

  const options = useMemo(() => ({
    cargos: uniqueSorted(colaboradoresComUnidade.map((row) => row.cargo)),
    escalas: uniqueSorted(colaboradoresComUnidade.map((row) => row.escala)),
    turnos: uniqueSorted(colaboradoresComUnidade.map((row) => row.turno)),
  }), [colaboradoresComUnidade])

  const scopedRows = useMemo(() => {
    return colaboradoresComUnidade.filter((row) => group === 'todos' || inferGroup(row) === group)
  }, [colaboradoresComUnidade, group])

  const kpis = useMemo(() => {
    const base = { plantao: 0, folga: 0, indefinido: 0 }
    for (const row of scopedRows) {
      const code = getDutyStatusByTurma(row.turma).code
      base[code] += 1
    }
    return base
  }, [scopedRows])

  const scoredRows = useMemo<ScoredRow[]>(() => {
    const entries = scopedRows
      .map((row) => ({ row, score: scoreRow(row, search) }))
      .filter((entry) => entry.score > 0)
      .filter((entry) => {
        const duty = getDutyStatusByTurma(entry.row.turma).code
        if (status !== 'todos' && duty !== status) return false
        if (cargo !== 'todos' && entry.row.cargo !== cargo) return false
        if (escala !== 'todos' && entry.row.escala !== escala) return false
        if (turno !== 'todos' && entry.row.turno !== turno) return false
        if (turma !== 'todos' && entry.row.turma !== turma) return false
        return true
      })

    entries.sort((a, b) => {
      if (sort === 'nome') return a.row.nome.localeCompare(b.row.nome, 'pt-BR')
      if (sort === 'posto') return a.row.posto.localeCompare(b.row.posto, 'pt-BR')
      if (sort === 'escala') return a.row.escala.localeCompare(b.row.escala, 'pt-BR')
      if (sort === 'status') return getDutyStatusByTurma(a.row.turma).label.localeCompare(getDutyStatusByTurma(b.row.turma).label, 'pt-BR')
      return b.score - a.score || a.row.nome.localeCompare(b.row.nome, 'pt-BR')
    })

    return entries.slice(0, resultLimit)
  }, [cargo, escala, scopedRows, search, sort, status, turma, turno])

  const selected = useMemo(() => {
    return scoredRows.find((entry) => personKey(entry.row) === selectedKey)?.row ?? scoredRows[0]?.row ?? null
  }, [scoredRows, selectedKey])

  useEffect(() => {
    if (selected && selectedKey !== personKey(selected)) setSelectedKey(personKey(selected))
  }, [selected, selectedKey, setSelectedKey])

  if (isLoading) return <LoadingPanel label="Carregando colaboradores e unidades do Supabase..." />
  if (isError) return <EmptyState title="Falha ao carregar a Busca Rápida" detail={error instanceof Error ? error.message : 'Confira as tabelas colaboradores e unidades no Supabase.'} />

  const grouped = groupResults(scoredRows, groupBy)

  return (
    <main className="search-os">
      <header className="search-hero">
        <div className="hero-brand">
          <div className="brand-sigil">DP</div>
          <div>
            <span>Busca Rápida V5</span>
            <strong>Central de cobertura operacional</strong>
          </div>
        </div>

        <div className="company-switcher" aria-label="Filtro por empresa">
          {groupRules.map((item) => (
            <button key={item.key} className={group === item.key ? 'company-chip active' : 'company-chip'} onClick={() => setGroup(item.key)}>
              {item.logo ? <img src={item.logo} alt="" /> : <ShieldCheck size={16} />}
              <span>{item.label}</span>
            </button>
          ))}
        </div>
      </header>

      <section className="command-deck">
        <div className="command-copy">
          <span className="system-label">Mesa de despacho</span>
          <h1>Quem cobre esse posto agora?</h1>
          <p>Digite poucas letras para localizar colaborador, posto, RE, matrícula, telefone, cargo, escala ou dados da unidade.</p>
        </div>
        <label className="search-box">
          <Search size={24} />
          <input value={search} onChange={(event) => setSearch(event.target.value)} autoFocus placeholder="Buscar: Adilson, 4854, Morumbi, bombeiro, 12x36..." />
        </label>
      </section>

      <section className="kpi-strip" aria-label="Indicadores de disponibilidade">
        <KpiCard label="Resultados" value={scoredRows.length} detail={`${scopedRows.length} na empresa selecionada`} tone="neutral" />
        <KpiCard label="Plantão hoje" value={kpis.plantao} detail="Cobertura ativa" tone="danger" />
        <KpiCard label="Folga hoje" value={kpis.folga} detail="Potenciais coberturas" tone="success" />
        <KpiCard label="Sem turma" value={kpis.indefinido} detail="Corrigir na planilha" tone="muted" />
      </section>

      <section className="filter-console">
        <div className="filter-title"><SlidersHorizontal size={18} /><strong>Filtros operacionais</strong></div>
        <SegmentedStatus value={status} onChange={setStatus} />
        <SelectFilter label="Cargo" value={cargo} onChange={setCargo} options={options.cargos} />
        <SelectFilter label="Escala" value={escala} onChange={setEscala} options={options.escalas} />
        <SelectFilter label="Turno" value={turno} onChange={setTurno} options={options.turnos} />
        <SelectFilter label="Turma" value={turma} onChange={setTurma} options={['1', '2']} />
        <SelectFilter label="Ordenar" value={sort} onChange={(value) => setSort(value as SearchSort)} options={['relevance', 'nome', 'posto', 'escala', 'status']} labels={{ relevance: 'Relevância', nome: 'Nome', posto: 'Posto', escala: 'Escala', status: 'Status' }} />
        <SelectFilter label="Agrupar" value={groupBy} onChange={(value) => setGroupBy(value as SearchGroup)} options={['none', 'posto', 'status', 'escala']} labels={{ none: 'Não agrupar', posto: 'Posto', status: 'Status', escala: 'Escala' }} />
        <button className="reset-filters" onClick={resetFilters}><RotateCcw size={16} /> Limpar</button>
      </section>

      <div className="operations-layout">
        <section className="roster-panel">
          <div className="panel-head">
            <div>
              <span className="system-label">Roster</span>
              <h2>Colaboradores encontrados</h2>
            </div>
            <span>{scoredRows.length} exibidos</span>
          </div>

          {scoredRows.length ? (
            <div className="grouped-results">
              {grouped.map((section) => (
                <div className="result-group" key={section.label}>
                  {groupBy !== 'none' ? <div className="group-header"><span>{section.label}</span><strong>{section.rows.length}</strong></div> : null}
                  <div className="roster-list">
                    {section.rows.map((entry) => (
                      <CoverageCandidateCard key={personKey(entry.row)} row={entry.row} query={search} selected={personKey(entry.row) === personKey(selected ?? entry.row)} onSelect={() => setSelectedKey(personKey(entry.row))} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="no-results">
              <Filter size={28} />
              <strong>Nenhum colaborador encontrado</strong>
              <p>Reduza filtros ou busque por nome, matrícula, RE, posto, telefone, cargo ou unidade.</p>
            </div>
          )}
        </section>

        <PersonContextPanel row={selected} />
      </div>
    </main>
  )
}

function KpiCard({ label, value, detail, tone }: { label: string; value: number; detail: string; tone: 'neutral' | 'danger' | 'success' | 'muted' }) {
  return <article className={`kpi-card ${tone}`}><span>{label}</span><strong>{value.toLocaleString('pt-BR')}</strong><small>{detail}</small></article>
}

function SegmentedStatus({ value, onChange }: { value: SearchStatusFilter; onChange: (value: SearchStatusFilter) => void }) {
  const items: Array<[SearchStatusFilter, string]> = [['todos', 'Todos'], ['plantao', 'Plantão'], ['folga', 'Folga'], ['indefinido', 'Sem turma']]
  return <div className="segmented-status">{items.map(([key, label]) => <button key={key} className={value === key ? 'active' : ''} onClick={() => onChange(key)}>{label}</button>)}</div>
}

function SelectFilter({ label, value, onChange, options, labels = {} }: { label: string; value: string; onChange: (value: string) => void; options: string[]; labels?: Record<string, string> }) {
  return (
    <label className="select-filter">
      <span>{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)}>
        <option value="todos">Todos</option>
        {options.map((option) => <option key={option} value={option}>{labels[option] ?? option}</option>)}
      </select>
    </label>
  )
}

function CoverageCandidateCard({ row, query, selected, onSelect }: { row: ColaboradorComUnidade; query: string; selected: boolean; onSelect: () => void }) {
  const duty = getDutyStatusByTurma(row.turma)
  return (
    <button className={`candidate-card ${selected ? 'selected' : ''} ${statusClass(duty.code)}`} onClick={onSelect}>
      <div className="candidate-status-rail" />
      <div className="candidate-avatar"><UserRound size={19} /></div>
      <div className="candidate-main">
        <div className="candidate-title-row">
          <strong>{highlight(row.nome || 'Sem nome', query)}</strong>
          <span className={`status-pill ${statusClass(duty.code)}`}>{statusLabel(duty.code)}</span>
        </div>
        <div className="candidate-meta">
          <span>{row.matricula ? `Mat. ${highlight(row.matricula, query)}` : 'Sem matrícula'}</span>
          <span>{row.re ? `RE ${highlight(row.re, query)}` : 'Sem RE'}</span>
          <span>{highlight(row.cargo || 'Cargo não informado', query)}</span>
        </div>
        <div className="candidate-route">
          <Building2 size={15} />
          <span>{highlight(row.posto || 'Posto não informado', query)}</span>
          {row.unidade?.cliente ? <em>{highlight(row.unidade.cliente, query)}</em> : null}
        </div>
      </div>
      <div className="candidate-schedule">
        <span>{row.escala || 'Sem escala'}</span>
        <strong>{row.turno || 'Sem turno'}</strong>
        <small>Turma {row.turma || '-'}</small>
      </div>
    </button>
  )
}

function PersonContextPanel({ row }: { row: ColaboradorComUnidade | null }) {
  if (!row) {
    return <aside className="context-panel empty"><CheckCircle2 size={34} /><strong>Selecione alguém para cobertura</strong><p>O detalhe rápido mostra telefone, posto, escala e unidade vinculada.</p></aside>
  }

  const duty = getDutyStatusByTurma(row.turma)
  const phone = asString(row.telefone)
  const mapUrl = row.unidade?.endereco ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(row.unidade.endereco)}` : ''
  const summary = buildSummary(row)
  const coverageSummary = `Cobertura sugerida\n${summary}\nUnidade: ${row.unidade?.posto || row.posto}\nEndereço: ${row.unidade?.endereco || 'não informado'}`

  return (
    <aside className="context-panel">
      <div className="context-top">
        <div className="context-avatar"><UserRound size={26} /></div>
        <div>
          <span className="system-label">Detalhe operacional</span>
          <h2>{row.nome || 'Sem nome'}</h2>
          <p>{row.cargo || 'Cargo não informado'}</p>
        </div>
      </div>

      <div className={`availability-card ${statusClass(duty.code)}`}>
        <span>Status hoje</span>
        <strong>{statusLabel(duty.code)}</strong>
        <small>{duty.description}</small>
      </div>

      <div className="quick-actions">
        <button onClick={() => void copyToClipboard(summary)}><Clipboard size={16} /> Copiar dados</button>
        <button onClick={() => void copyToClipboard(coverageSummary)}><Clipboard size={16} /> Copiar cobertura</button>
        {phone ? <a href={`tel:${phone}`}><Phone size={16} /> Ligar</a> : null}
        {phone ? <a href={`https://wa.me/55${phone.replace(/\D/g, '')}`} target="_blank"><MessageCircle size={16} /> WhatsApp</a> : null}
        {mapUrl ? <a href={mapUrl} target="_blank"><MapPin size={16} /> Mapa</a> : null}
      </div>

      <InfoSection title="Colaborador" rows={[
        ['Matrícula', row.matricula],
        ['RE', row.re],
        ['Telefone', row.telefone],
        ['Empresa', row.empresa],
        ['Unidade negócio', row.unidadeNegocio],
      ]} />

      <InfoSection title="Escala" rows={[
        ['Escala', row.escala],
        ['Turno', row.turno],
        ['Turma', row.turma],
        ['Regra', duty.description],
      ]} />

      <InfoSection title="Unidade vinculada" rows={[
        ['Posto', row.unidade?.posto || row.posto],
        ['Cliente', row.unidade?.cliente],
        ['Endereço', row.unidade?.endereco],
        ['Cidade', row.unidade?.cidade],
        ['E-mail', row.unidade?.email],
      ]} />

      <InfoSection title="Datas úteis" rows={[
        ['Admissão', formatDate(row.data_admissao || row.admissao)],
        ['ASO', asString(row.aso)],
        ['Reciclagem', asString(row['reciclagem bombeiro'] || row.reciclagem)],
      ]} />
    </aside>
  )
}

function InfoSection({ title, rows }: { title: string; rows: Array<[string, unknown]> }) {
  const visibleRows = rows.filter(([, value]) => asString(value))
  if (!visibleRows.length) return null
  return <section className="info-section"><h3>{title}</h3>{visibleRows.map(([label, value]) => <div key={label}><span>{label}</span><strong>{asString(value)}</strong></div>)}</section>
}
