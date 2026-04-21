import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function normalizeText(value: unknown) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

export function normalizeKey(value: unknown) {
  return normalizeText(value).replace(/\s+/g, ' ')
}

export function asString(value: unknown) {
  return String(value ?? '').trim()
}

export function pickFirst(row: Record<string, unknown> | undefined, keys: string[]) {
  if (!row) return ''
  for (const key of keys) {
    const direct = row[key]
    if (asString(direct)) return asString(direct)
    const foundKey = Object.keys(row).find((candidate) => normalizeKey(candidate) === normalizeKey(key))
    if (foundKey && asString(row[foundKey])) return asString(row[foundKey])
  }
  return ''
}

export function formatDate(value: unknown) {
  const raw = asString(value)
  if (!raw) return ''
  const date = new Date(raw.includes('T') ? raw : `${raw}T00:00:00`)
  if (Number.isNaN(date.getTime())) return raw
  return new Intl.DateTimeFormat('pt-BR').format(date)
}

export function formatDateTime(value: unknown) {
  const raw = asString(value)
  if (!raw) return ''
  const date = new Date(raw)
  if (Number.isNaN(date.getTime())) return raw
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(date)
}

export function onlyDigits(value: unknown) {
  return asString(value).replace(/\D/g, '')
}

export function buildSearchBlob(...parts: unknown[]) {
  return normalizeText(parts.filter(Boolean).join(' '))
}

export function copyToClipboard(text: string) {
  if (navigator.clipboard?.writeText) return navigator.clipboard.writeText(text)
  const textarea = document.createElement('textarea')
  textarea.value = text
  document.body.appendChild(textarea)
  textarea.select()
  document.execCommand('copy')
  textarea.remove()
  return Promise.resolve()
}

export function createProtocol(prefix = 'DP') {
  const date = new Date()
  const stamp = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}`
  return `${prefix}-${stamp}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`
}
