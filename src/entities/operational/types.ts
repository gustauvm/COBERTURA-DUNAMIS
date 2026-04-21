import { z } from 'zod'
import { pickFirst, normalizeKey, buildSearchBlob } from '../../shared/lib/utils'

export const rawRowSchema = z.record(z.string(), z.unknown())
export type RawRow = z.infer<typeof rawRowSchema>

export type Colaborador = RawRow & {
  id?: string | number
  nome: string
  matricula: string
  re: string
  posto: string
  cargo: string
  escala: string
  turno: string
  turma: string
  telefone: string
  empresa: string
  unidadeNegocio: string
  searchText: string
}

export type Unidade = RawRow & {
  id?: string | number
  posto: string
  cliente: string
  empresa: string
  unidadeNegocio: string
  endereco: string
  cidade: string
  estado: string
  email: string
  searchText: string
}

export type ColaboradorComUnidade = Colaborador & {
  unidade?: Unidade
}

export const groupRules = [
  { key: 'todos', label: 'Todas', logo: '', patterns: [] },
  { key: 'bombeiros', label: 'Bombeiros', logo: '/logos/logo-dunamis-bombeiros.png', patterns: ['BOMBEIRO', 'BOMBEIROS', 'BRIGADA'] },
  { key: 'servicos', label: 'Serviços', logo: '/logos/logo-dunamis-servicos.png', patterns: ['SERVICO', 'SERVIÇO', 'SERVICOS', 'SERVIÇOS'] },
  { key: 'seguranca', label: 'Segurança', logo: '/logos/logo-dunamis-seguranca.png', patterns: ['SEGURANCA', 'SEGURANÇA', 'VIGILANCIA', 'VIGILÂNCIA', 'VIGILANTE'] },
  { key: 'rb', label: 'RB Facilities', logo: '/logos/logo-rb.png', patterns: ['RB FACILITIES', 'RB FACILITY', 'RB'] },
] as const

export type GroupKey = (typeof groupRules)[number]['key']

export function normalizeColaborador(row: RawRow): Colaborador {
  const nome = pickFirst(row, ['nome', 'colaborador', 'nome completo'])
  const matricula = pickFirst(row, ['matricula', 'matrícula'])
  const re = pickFirst(row, ['re', 'registro', 're padrao', 're padrão', 're novo'])
  const posto = pickFirst(row, ['posto', 'unidade', 'local'])
  const cargo = pickFirst(row, ['cargo', 'funcao', 'função'])
  const escala = pickFirst(row, ['escala'])
  const turno = pickFirst(row, ['turno', 'horario', 'horário'])
  const turma = pickFirst(row, ['turma'])
  const telefone = pickFirst(row, ['telefone', 'celular', 'whatsapp'])
  const empresa = pickFirst(row, ['empresa', 'empresa folha', 'empregador'])
  const unidadeNegocio = pickFirst(row, ['unidade de negocio', 'unidade de negócio', 'negocio', 'negócio'])
  return {
    ...row,
    nome,
    matricula,
    re,
    posto,
    cargo,
    escala,
    turno,
    turma,
    telefone,
    empresa,
    unidadeNegocio,
    searchText: buildSearchBlob(nome, matricula, re, posto, cargo, escala, turno, turma, telefone, empresa, unidadeNegocio, Object.values(row).join(' ')),
  }
}

export function normalizeUnidade(row: RawRow): Unidade {
  const posto = pickFirst(row, ['posto', 'unidade', 'local'])
  const cliente = pickFirst(row, ['cliente', 'tomador'])
  const empresa = pickFirst(row, ['empresa', 'empresa folha', 'empregador'])
  const unidadeNegocio = pickFirst(row, ['unidade de negocio', 'unidade de negócio', 'negocio', 'negócio'])
  const endereco = pickFirst(row, ['endereco_formatado', 'endereço formatado', 'endereco', 'endereço', 'logradouro'])
  const cidade = pickFirst(row, ['cidade', 'municipio', 'município'])
  const estado = pickFirst(row, ['estado', 'uf'])
  const email = pickFirst(row, ['email', 'email supervisor da unidade', 'email sesmt', 'email rh', 'email dp'])
  return {
    ...row,
    posto,
    cliente,
    empresa,
    unidadeNegocio,
    endereco,
    cidade,
    estado,
    email,
    searchText: buildSearchBlob(posto, cliente, empresa, unidadeNegocio, endereco, cidade, estado, email, Object.values(row).join(' ')),
  }
}

export function unitKey(value: unknown) {
  return normalizeKey(value)
}

export function inferGroup(row: { cargo?: string; empresa?: string; unidadeNegocio?: string; posto?: string }) {
  const blob = `${row.cargo ?? ''} ${row.empresa ?? ''} ${row.unidadeNegocio ?? ''} ${row.posto ?? ''}`.toUpperCase()
  return groupRules.find((group) => group.key !== 'todos' && group.patterns.some((pattern) => blob.includes(pattern)))?.key ?? 'todos'
}
