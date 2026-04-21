import { ArrowRight, Building2, FileText, Search, ShieldCheck, Zap } from 'lucide-react'
import { useAppStore } from '../../app/store'
import { useOperationalData } from '../../entities/operational/hooks'
import { getDutyStatusByTurma } from '../../shared/lib/duty'
import { Card } from '../../shared/ui/Card'
import { Button } from '../../shared/ui/Button'

export function GatewayPage() {
  const setSection = useAppStore((state) => state.setSection)
  const { colaboradoresComUnidade, unidades } = useOperationalData()
  const plantao = colaboradoresComUnidade.filter((row) => getDutyStatusByTurma(row.turma).code === 'plantao').length
  const folga = colaboradoresComUnidade.filter((row) => getDutyStatusByTurma(row.turma).code === 'folga').length

  return (
    <div className="page-stack">
      <section className="hero-grid">
        <div className="hero-card">
          <span className="eyebrow">V5 em desenvolvimento seguro</span>
          <h2>Central operacional reconstruída do zero.</h2>
          <p>
            Busca, unidades e formalizações em uma interface de operação moderna, com dados do Supabase e sem tocar na planilha.
          </p>
          <div className="hero-actions">
            <Button onClick={() => setSection('busca')}>Abrir busca operacional</Button>
            <Button variant="secondary" onClick={() => setSection('formalizador')}>Criar formalização</Button>
          </div>
        </div>
        <div className="ops-board">
          <div><span>Plantão hoje</span><strong>{plantao}</strong></div>
          <div><span>Folga hoje</span><strong>{folga}</strong></div>
          <div><span>Unidades</span><strong>{unidades.length}</strong></div>
          <div><span>Fonte</span><strong>Supabase</strong></div>
        </div>
      </section>

      <section className="module-grid">
        {[
          { icon: Search, title: 'Central de Busca', text: 'Busca instantânea por colaborador, posto, RE, matrícula, telefone e status de plantão.', action: 'busca' as const },
          { icon: Building2, title: 'Diretório de Unidades', text: 'Unidades com endereço, contatos, empresa, cliente e colaboradores vinculados.', action: 'unidades' as const },
          { icon: FileText, title: 'Formalizador', text: 'Abertura de casos operacionais com protocolo, histórico, e-mail e WhatsApp prontos.', action: 'formalizador' as const },
        ].map((item) => {
          const Icon = item.icon
          return (
            <Card key={item.title} className="module-card">
              <Icon size={24} />
              <h3>{item.title}</h3>
              <p>{item.text}</p>
              <button onClick={() => setSection(item.action)}>Entrar <ArrowRight size={16} /></button>
            </Card>
          )
        })}
      </section>

      <Card className="principles-card">
        <Zap size={22} />
        <div>
          <h3>Princípios da V5</h3>
          <p>Sem login nesta etapa, sem edição local de colaboradores/unidades, sem dependência da planilha no Formalizador e sem visual herdado da v4.1.</p>
        </div>
        <ShieldCheck size={22} />
      </Card>
    </div>
  )
}
