import { Clipboard, FileText, History, Mail, MessageCircle, Search } from 'lucide-react'
import { useMemo, useState } from 'react'
import { type ColaboradorComUnidade, type Unidade } from '../../entities/operational/types'
import { useOperationalData } from '../../entities/operational/hooks'
import { coverageOptions, emptyDraft, formalizerStatuses, formalizerTypes, motiveOptions, type FormalizerDraft, type FormalizerStatus } from '../../entities/formalizador/types'
import { buildFormalizacaoPayload, requiresDestination, validateDraft } from '../../entities/formalizador/rules'
import { useCreateFormalizacao, useFormalizacaoEvents, useFormalizacoes, useUpdateFormalizacaoStatus } from '../../entities/formalizador/hooks'
import { asString, copyToClipboard, formatDateTime, normalizeText } from '../../shared/lib/utils'
import { Badge } from '../../shared/ui/Badge'
import { Button } from '../../shared/ui/Button'
import { Card } from '../../shared/ui/Card'
import { EmptyState } from '../../shared/ui/EmptyState'
import { Field, SelectInput, TextArea, TextInput } from '../../shared/ui/Field'
import { LoadingPanel } from '../../shared/ui/LoadingPanel'

const requesterStorageKey = 'dunamis-v5-formalizer-requester'

function loadRequester() {
  try {
    return JSON.parse(localStorage.getItem(requesterStorageKey) || '{}') as Partial<FormalizerDraft>
  } catch {
    return {}
  }
}

export function FormalizerPage() {
  const { colaboradoresComUnidade, unidades, isLoading } = useOperationalData()
  const [draft, setDraft] = useState<FormalizerDraft>(() => ({ ...emptyDraft, ...loadRequester() }))
  const [peopleSearch, setPeopleSearch] = useState('')
  const [unitSearch, setUnitSearch] = useState('')
  const [coverageSearch, setCoverageSearch] = useState('')
  const [lastCreatedId, setLastCreatedId] = useState('')
  const createFormalizacao = useCreateFormalizacao()

  const colaborador = colaboradoresComUnidade.find((row) => keyPerson(row) === draft.colaboradorKey)
  const destino = unidades.find((row) => keyUnit(row) === draft.destinoKey)
  const cobertura = colaboradoresComUnidade.find((row) => keyPerson(row) === draft.coberturaKey)
  const validation = validateDraft(draft, colaborador, destino, cobertura)
  const preview = !validation && colaborador ? buildFormalizacaoPayload(draft, colaborador, destino, cobertura) : null

  const people = filterPeople(colaboradoresComUnidade, peopleSearch).slice(0, 8)
  const destinationUnits = filterUnits(unidades, unitSearch).slice(0, 8)
  const coveragePeople = filterPeople(colaboradoresComUnidade, coverageSearch).slice(0, 8)

  function update<K extends keyof FormalizerDraft>(key: K, value: FormalizerDraft[K]) {
    const next = { ...draft, [key]: value }
    setDraft(next)
    if (['solicitanteNome', 'solicitanteCargo', 'solicitanteTelefone', 'solicitanteEmail'].includes(String(key))) {
      localStorage.setItem(requesterStorageKey, JSON.stringify({
        solicitanteNome: next.solicitanteNome,
        solicitanteCargo: next.solicitanteCargo,
        solicitanteTelefone: next.solicitanteTelefone,
        solicitanteEmail: next.solicitanteEmail,
      }))
    }
  }

  async function submit() {
    if (validation || !colaborador) return
    const payload = buildFormalizacaoPayload(draft, colaborador, destino, cobertura)
    const record = await createFormalizacao.mutateAsync(payload)
    setLastCreatedId(record.id)
    await copyToClipboard(record.email_body || '')
    setDraft((current) => ({ ...emptyDraft, solicitanteNome: current.solicitanteNome, solicitanteCargo: current.solicitanteCargo, solicitanteTelefone: current.solicitanteTelefone, solicitanteEmail: current.solicitanteEmail }))
  }

  if (isLoading) return <LoadingPanel />

  return (
    <div className="formalizer-layout">
      <aside className="catalog-panel">
        <div className="section-head compact"><div><span className="eyebrow">Catálogo</span><h2>Solicitações</h2></div></div>
        <div className="catalog-list">
          {Object.entries(formalizerTypes).map(([key, label]) => (
            <button key={key} className={draft.tipo === key ? 'catalog-item active' : 'catalog-item'} onClick={() => update('tipo', key as FormalizerDraft['tipo'])}>
              <FileText size={18} /><span>{label}</span>
            </button>
          ))}
        </div>
      </aside>

      <section className="case-builder">
        <div className="section-head"><div><span className="eyebrow">Caso operacional</span><h2>{draft.tipo ? formalizerTypes[draft.tipo] : 'Escolha uma solicitação'}</h2></div><Badge tone={validation ? 'warning' : 'good'}>{validation || 'Pronto para registrar'}</Badge></div>

        <Card className="form-section">
          <h3>Solicitante</h3>
          <div className="form-grid">
            <Field label="Nome *"><TextInput value={draft.solicitanteNome} onChange={(e) => update('solicitanteNome', e.target.value)} /></Field>
            <Field label="Função/Cargo *"><TextInput value={draft.solicitanteCargo} onChange={(e) => update('solicitanteCargo', e.target.value)} /></Field>
            <Field label="Telefone *"><TextInput value={draft.solicitanteTelefone} onChange={(e) => update('solicitanteTelefone', e.target.value)} /></Field>
            <Field label="E-mail"><TextInput value={draft.solicitanteEmail} onChange={(e) => update('solicitanteEmail', e.target.value)} /></Field>
          </div>
        </Card>

        <Card className="form-section">
          <h3>Colaborador</h3>
          {colaborador ? <SelectedPerson row={colaborador} label="Selecionado" /> : null}
          <div className="search-control"><Search size={18} /><TextInput value={peopleSearch} onChange={(e) => setPeopleSearch(e.target.value)} placeholder="Buscar por nome, matrícula, RE, posto, cargo..." /></div>
          <PickerList rows={people} onSelect={(row) => update('colaboradorKey', keyPerson(row))} />
        </Card>

        <Card className="form-section">
          <h3>Alteração solicitada</h3>
          <div className="compare-grid">
            <div><span>Antes</span>{colaborador ? <MiniContext title={colaborador.posto || 'Posto atual'} lines={[colaborador.cargo, colaborador.escala, colaborador.turno]} /> : <p>Selecione o colaborador.</p>}</div>
            <div><span>Depois</span>{requiresDestination(draft.tipo) ? destino ? <MiniContext title={destino.posto} lines={[destino.cliente, destino.endereco]} /> : <p>Selecione o destino.</p> : <p>Este tipo não exige posto destino.</p>}</div>
          </div>
          <div className="form-grid">
            <Field label="Data efetiva *"><TextInput type="date" value={draft.dataEfetiva} onChange={(e) => update('dataEfetiva', e.target.value)} /></Field>
            <Field label={draft.tipo === 'termino_experiencia' ? 'Data fim *' : 'Data fim'}><TextInput type="date" value={draft.dataFim} onChange={(e) => update('dataFim', e.target.value)} /></Field>
            <Field label="Prioridade"><SelectInput value={draft.prioridade} onChange={(e) => update('prioridade', e.target.value as FormalizerDraft['prioridade'])}><option value="baixa">Baixa</option><option value="normal">Normal</option><option value="alta">Alta</option><option value="urgente">Urgente</option></SelectInput></Field>
            <Field label="Motivo/categoria *"><SelectInput value={draft.motivoCategoria} onChange={(e) => update('motivoCategoria', e.target.value as FormalizerDraft['motivoCategoria'])}><option value="">Selecione</option>{Object.entries(motiveOptions).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</SelectInput></Field>
          </div>
          {requiresDestination(draft.tipo) ? <><div className="search-control"><Search size={18} /><TextInput value={unitSearch} onChange={(e) => setUnitSearch(e.target.value)} placeholder="Buscar posto destino..." /></div><UnitPicker rows={destinationUnits} onSelect={(unit) => update('destinoKey', keyUnit(unit))} /></> : null}
          <Field label="Observações"><TextArea value={draft.motivoObservacao} onChange={(e) => update('motivoObservacao', e.target.value)} /></Field>
        </Card>

        <Card className="form-section">
          <h3>Impactos e cobertura</h3>
          <div className="impact-grid">
            {[
              ['valeTransporte', 'Vale transporte'], ['valeRefeicao', 'Refeição / VR'], ['adicionalNoturno', 'Adicional noturno'], ['intrajornada', 'Intrajornada'], ['escalaTurno', 'Escala / turno'],
            ].map(([key, label]) => <label key={key} className="check-card"><input type="checkbox" checked={Boolean(draft.beneficios[key as keyof typeof draft.beneficios])} onChange={(e) => update('beneficios', { ...draft.beneficios, [key]: e.target.checked })} /><span>{label}</span></label>)}
          </div>
          <Field label="Observações de benefícios"><TextArea value={draft.beneficios.observacoes} onChange={(e) => update('beneficios', { ...draft.beneficios, observacoes: e.target.value })} /></Field>
          <div className="form-grid single">
            <Field label="Decisão de cobertura *"><SelectInput value={draft.cobertura.tipo} onChange={(e) => update('cobertura', { ...draft.cobertura, tipo: e.target.value as FormalizerDraft['cobertura']['tipo'] })}><option value="">Selecione</option>{Object.entries(coverageOptions).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</SelectInput></Field>
            <Field label="Período"><TextInput value={draft.cobertura.periodo} onChange={(e) => update('cobertura', { ...draft.cobertura, periodo: e.target.value })} /></Field>
          </div>
          {draft.cobertura.tipo && draft.cobertura.tipo !== 'sem_cobertura' ? <><div className="search-control"><Search size={18} /><TextInput value={coverageSearch} onChange={(e) => setCoverageSearch(e.target.value)} placeholder="Buscar substituto..." /></div><PickerList rows={coveragePeople} onSelect={(row) => update('coberturaKey', keyPerson(row))} /></> : null}
          <Field label="Observações de cobertura"><TextArea value={draft.cobertura.observacoes} onChange={(e) => update('cobertura', { ...draft.cobertura, observacoes: e.target.value })} /></Field>
        </Card>

        <Card className="form-section sticky-review">
          <h3>Revisão e comunicação</h3>
          {preview ? <pre className="message-preview">{preview.email_body}</pre> : <p>{validation}</p>}
          <div className="action-row"><Button disabled={Boolean(validation) || createFormalizacao.isPending} onClick={() => void submit()}>{createFormalizacao.isPending ? 'Registrando...' : 'Registrar protocolo'}</Button>{preview ? <Button variant="secondary" onClick={() => void copyToClipboard(preview.email_body || '')}>Copiar prévia</Button> : null}</div>
        </Card>
      </section>

      <HistoryPanel lastCreatedId={lastCreatedId} />
    </div>
  )
}

function HistoryPanel({ lastCreatedId }: { lastCreatedId: string }) {
  const { data: history = [] } = useFormalizacoes()
  const { data: events = [] } = useFormalizacaoEvents()
  const updateStatus = useUpdateFormalizacaoStatus()
  const [selectedId, setSelectedId] = useState('')
  const selected = history.find((item) => item.id === (selectedId || lastCreatedId)) ?? history[0]
  const selectedEvents = useMemo(() => events.filter((event) => event.formalizacao_id === selected?.id), [events, selected?.id])

  return <aside className="history-panel"><div className="section-head compact"><div><span className="eyebrow">Histórico</span><h2>Protocolos</h2></div><History size={20} /></div><div className="history-list">{history.slice(0, 12).map((item) => <button key={item.id} className={selected?.id === item.id ? 'history-item active' : 'history-item'} onClick={() => setSelectedId(item.id)}><strong>{item.protocolo}</strong><span>{item.colaborador_nome}</span><Badge tone="info">{formalizerStatuses[item.status] ?? item.status}</Badge></button>)}</div>{selected ? <Card className="history-detail"><h3>{selected.protocolo}</h3><p>{[selected.colaborador_nome, selected.posto_atual, selected.posto_destino].filter(Boolean).join(' • ')}</p><SelectInput value={selected.status} onChange={(e) => updateStatus.mutate({ id: selected.id, status: e.target.value as FormalizerStatus, currentStatus: selected.status })}>{Object.entries(formalizerStatuses).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</SelectInput><div className="action-row"><button onClick={() => void copyToClipboard(selected.email_body || '')}><Clipboard size={16} /> E-mail</button><a href={`mailto:?subject=${encodeURIComponent(selected.email_subject || '')}&body=${encodeURIComponent(selected.email_body || '')}`}><Mail size={16} /> Gmail</a><a href={`https://wa.me/?text=${encodeURIComponent(selected.whatsapp_text || '')}`} target="_blank"><MessageCircle size={16} /> WhatsApp</a></div><div className="timeline">{(selectedEvents.length ? selectedEvents : [{ id: 'created', status_novo: selected.status, created_at: selected.created_at, observacao: 'Caso registrado.' }]).map((event) => <div key={event.id}><span>{formatDateTime(event.created_at)}</span><strong>{formalizerStatuses[event.status_novo as FormalizerStatus] ?? event.status_novo}</strong><small>{event.observacao}</small></div>)}</div></Card> : <EmptyState title="Sem protocolos" detail="Os casos registrados aparecerão aqui." />}</aside>
}

function filterPeople(rows: ColaboradorComUnidade[], query: string) { const q = normalizeText(query); return rows.filter((row) => !q || row.searchText.includes(q) || normalizeText(row.unidade?.searchText).includes(q)) }
function filterUnits(rows: Unidade[], query: string) { const q = normalizeText(query); return rows.filter((row) => !q || row.searchText.includes(q)) }
function keyPerson(row: ColaboradorComUnidade) { return `${row.matricula || row.re || row.nome}|${row.posto}` }
function keyUnit(row: Unidade) { return `${row.posto}|${row.cliente}` }
function PickerList({ rows, onSelect }: { rows: ColaboradorComUnidade[]; onSelect: (row: ColaboradorComUnidade) => void }) { return <div className="picker-list">{rows.map((row) => <button key={keyPerson(row)} onClick={() => onSelect(row)}><strong>{row.nome}</strong><span>{[row.matricula, row.re, row.posto, row.cargo].filter(Boolean).join(' • ')}</span></button>)}</div> }
function UnitPicker({ rows, onSelect }: { rows: Unidade[]; onSelect: (row: Unidade) => void }) { return <div className="picker-list">{rows.map((row) => <button key={keyUnit(row)} onClick={() => onSelect(row)}><strong>{row.posto}</strong><span>{[row.cliente, row.endereco].filter(Boolean).join(' • ')}</span></button>)}</div> }
function SelectedPerson({ row, label }: { row: ColaboradorComUnidade; label: string }) { return <div className="selected-card"><span>{label}</span><strong>{row.nome}</strong><small>{[row.matricula, row.re, row.posto, row.cargo].filter(Boolean).join(' • ')}</small></div> }
function MiniContext({ title, lines }: { title: string; lines: unknown[] }) { return <div className="mini-context"><strong>{title}</strong>{lines.filter((line) => asString(line)).map((line) => <small key={asString(line)}>{asString(line)}</small>)}</div> }
