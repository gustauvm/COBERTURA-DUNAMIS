export type DutyStatus = {
  code: 'plantao' | 'folga' | 'indefinido'
  label: string
  description: string
}

export function getDutyStatusByTurma(turma: unknown, date = new Date()): DutyStatus {
  const normalized = String(turma ?? '').trim()
  const day = date.getDate()
  const isOdd = day % 2 !== 0

  if (normalized === '1') {
    return isOdd
      ? { code: 'plantao', label: 'Plantão', description: 'Turma 1 trabalha em dias ímpares.' }
      : { code: 'folga', label: 'Folga', description: 'Turma 1 folga em dias pares.' }
  }

  if (normalized === '2') {
    return isOdd
      ? { code: 'folga', label: 'Folga', description: 'Turma 2 folga em dias ímpares.' }
      : { code: 'plantao', label: 'Plantão', description: 'Turma 2 trabalha em dias pares.' }
  }

  return { code: 'indefinido', label: 'Sem turma', description: 'Informe TURMA 1 ou 2 na planilha.' }
}
