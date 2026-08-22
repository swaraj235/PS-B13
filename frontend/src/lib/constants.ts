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

// ── Hierarchy: Substation Zone & Feeder Line Sections ──────────────────────────
export const SECTION_NAMES: Record<number, { title: string; area: string; desc: string; tower: string; lat: number; lon: number; dist_km: number }> = {
  1: { title: 'Feeder Section 1', area: 'Kothrud Substation Bus (0 - 1.2 km)', desc: '11kV Feeder Line — Substation Outlet', tower: 'Tower #T1-04', lat: 18.5074, lon: 73.8077, dist_km: 1.15 },
  2: { title: 'Feeder Section 2', area: 'Paud Branch Trunk (1.2 - 2.8 km)', desc: '11kV Feeder Line — Paud Branch Sub', tower: 'Tower #T2-06', lat: 18.5158, lon: 73.8130, dist_km: 2.12 },
  3: { title: 'Feeder Section 3', area: 'Kondhwa Commercial Spur (2.8 - 4.5 km)', desc: '22/11kV Primary Feeder — Kondhwa Sub', tower: 'Tower #T3-09', lat: 18.4722, lon: 73.8860, dist_km: 3.45 },
  4: { title: 'Feeder Section 4', area: 'Hadapsar Industrial Spur (4.5 - 6.2 km)', desc: '22kV Industrial Line — Hadapsar Sub', tower: 'Tower #T4-12', lat: 18.5089, lon: 73.9259, dist_km: 5.10 },
  5: { title: 'Feeder Section 5', area: 'Swargate Core Tail (6.2 - 8.0 km)', desc: '11kV Central Core — Swargate Substation', tower: 'Tower #T5-03', lat: 18.5018, lon: 73.8586, dist_km: 6.85 },
}

export const SECTION_VILLAGES: Record<number, string[]> = {
  1: ['Kothrud Central', 'Karve Nagar', 'Warje Malwadi', 'Erandwane'],
  2: ['Paud Road', 'Ideal Colony', 'Bavdhan Khurd', 'Bhugaon'],
  3: ['Kondhwa Budruk', 'Kondhwa Khurd', 'Undri', 'Pisoli', 'NIBM Rd'],
  4: ['Hadapsar', 'Magarpatta', 'Amanora', 'Mundhwa'],
  5: ['Swargate Terminal', 'Camp Market', 'Parvati Hill', 'Shivajinagar'],
}
