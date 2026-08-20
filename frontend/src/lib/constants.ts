import type { FaultTypeKey, SectionStatus } from '../types'

export const FAULT_TYPES: Record<FaultTypeKey, string> = {
  conductor_damage:     'Conductor Damage',
  transformer_overload: 'Transformer Overload',
  vegetation_contact:   'Vegetation Contact',
  illegal_tap:          'Illegal Tap',
  grounding_fault:      'Grounding Fault',
  normal:               'Normal',
} as const

export const SECTION_STATUS = {
  normal:   'normal',
  warning:  'warning',
  critical: 'critical',
} as const

export const STATUS_COLORS: Record<SectionStatus, string> = {
  normal:   '#22C55E',
  warning:  '#F59E0B',
  critical: '#EF4444',
}

export const STATUS_BG: Record<SectionStatus, string> = {
  normal:   'rgba(34,197,94,0.1)',
  warning:  'rgba(245,158,11,0.1)',
  critical: 'rgba(239,68,68,0.1)',
}

export const WS_MESSAGE_TYPES = {
  SENSOR_READING: 'sensor_reading',
  FAULT_ALERT:    'fault_alert',
  HEARTBEAT:      'heartbeat',
} as const

export const SECTION_COORDINATES: Record<number, [number, number][]> = {
  1: [[73.800, 18.500], [73.820, 18.515]],
  2: [[73.820, 18.515], [73.840, 18.525]],
  3: [[73.840, 18.525], [73.860, 18.535]],
  4: [[73.860, 18.535], [73.880, 18.542]],
  5: [[73.880, 18.542], [73.900, 18.548]],
}

export const API_BASE = (import.meta as any).env?.VITE_API_URL ?? 'http://localhost:8000'
export const WS_BASE  = (import.meta as any).env?.VITE_WS_URL  ?? 'ws://localhost:8000'

export const SECTION_VILLAGES: Record<number, string[]> = {
  1: ['Kothrud', 'Warje'],
  2: ['Paud', 'Bhugaon'],
  3: ['Vadgaon', 'Pirangut', 'Bavdhan'],
  4: ['Mulshi', 'Lavad'],
  5: ['Tamhini', 'Donaje'],
}
