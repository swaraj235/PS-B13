import { STATUS_COLORS } from './constants'
import type { SectionStatus, FaultTypeKey } from '../types'

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-IN', {
    hour:   '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  })
}

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('en-IN', {
    year:   'numeric',
    month:  '2-digit',
    day:    '2-digit',
    hour:   '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  })
}

export function statusToColor(status: SectionStatus): string {
  return STATUS_COLORS[status]
}

export function faultTypeLabel(key: string): string {
  const labels: Record<string, string> = {
    conductor_damage:     'Conductor Damage',
    transformer_overload: 'Transformer Overload',
    vegetation_contact:   'Vegetation Contact',
    illegal_tap:          'Illegal Tap',
    grounding_fault:      'Grounding Fault',
    normal:               'Normal',
  }
  return labels[key] ?? key
}

export function formatUptime(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  return [h, m, s].map(n => String(n).padStart(2, '0')).join(':')
}

export function pct(value: number): string {
  return `${(value * 100).toFixed(1)}%`
}

export function colorByProb(prob: number): string {
  if (prob >= 0.70) return '#EF4444'
  if (prob >= 0.40) return '#F59E0B'
  return '#22C55E'
}
