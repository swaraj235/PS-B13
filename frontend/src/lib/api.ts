import { API_BASE } from './constants'
import type {
  LocalizeResponse,
  ClassifyResponse,
  ExplainResponse,
  TerraShieldResponse,
  SwitchingGuideResponse,
  ComplaintRequest,
  ComplaintResponse,
  FaultTypeKey,
  User,
  AuthResponse,
} from '../types'

function getHeaders(token?: string | null): Record<string, string> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  const authToken = token || localStorage.getItem('gridsentinel_token')
  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`
  }
  return headers
}

async function get<T>(path: string, token?: string | null): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, { headers: getHeaders(token) })
  if (!res.ok) {
    const errData = await res.json().catch(() => ({}))
    throw new Error(errData.detail || `API error ${res.status}: ${path}`)
  }
  return res.json()
}

async function post<T>(path: string, body: unknown, token?: string | null): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method:  'POST',
    headers: getHeaders(token),
    body:    JSON.stringify(body),
  })
  if (!res.ok) {
    const errData = await res.json().catch(() => ({}))
    throw new Error(errData.detail || `API error ${res.status}: ${path}`)
  }
  return res.json()
}

async function patch<T>(path: string, body?: unknown, token?: string | null): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method:  'PATCH',
    headers: getHeaders(token),
    body:    body ? JSON.stringify(body) : undefined,
  })
  if (!res.ok) {
    const errData = await res.json().catch(() => ({}))
    throw new Error(errData.detail || `API error ${res.status}: ${path}`)
  }
  return res.json()
}

async function put<T>(path: string, body: unknown, token?: string | null): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method:  'PUT',
    headers: getHeaders(token),
    body:    JSON.stringify(body),
  })
  if (!res.ok) {
    const errData = await res.json().catch(() => ({}))
    throw new Error(errData.detail || `API error ${res.status}: ${path}`)
  }
  return res.json()
}

export const api = {
  // Auth
  signup:            (data: unknown): Promise<AuthResponse> => post('/api/auth/signup', data),
  login:             (data: unknown): Promise<AuthResponse> => post('/api/auth/login', data),
  getMe:             (): Promise<User>                     => get('/api/auth/me'),
  updateProfile:     (data: unknown): Promise<User>        => put('/api/auth/profile', data),

  // Fault
  getFaultLocalize:  (): Promise<LocalizeResponse>      => get('/api/fault/localize'),
  getFaultClassify:  (sectionId: number): Promise<ClassifyResponse>  => get(`/api/fault/classify?section_id=${sectionId}`),
  injectFault:       (sectionId: number, faultType: FaultTypeKey)    => post('/api/fault/inject', { section_id: sectionId, fault_type: faultType }),
  resetFault:        () => post('/api/fault/reset', {}),

  // SHAP explanation
  getExplain:        (sectionId: number): Promise<ExplainResponse>   => get(`/api/explain?section_id=${sectionId}`),

  // TerraShield
  getTerraShield:    (): Promise<TerraShieldResponse>   => get('/api/terrashield/status'),
  mockTowerTFR:      (towerId: string, tfrOhm: number) => post('/api/terrashield/mock', { tower_id: towerId, tfr_ohm: tfrOhm }),

  // GIS
  getFaultOverlay:   (): Promise<unknown>               => get('/api/gis/fault-overlay'),
  getCrewRoute:      (sectionId: number): Promise<unknown> => get(`/api/gis/crew-route?section_id=${sectionId}`),

  // Switching
  getSwitchingGuide: (sectionId: number): Promise<SwitchingGuideResponse> => get(`/api/switching/guide?section_id=${sectionId}`),

  // Villages
  getAffectedVillages: (sectionId: number): Promise<{ villages: string[] }> => get(`/api/villages/affected?section_id=${sectionId}`),

  // Complaints
  submitComplaint:     (req: ComplaintRequest): Promise<ComplaintResponse> => post('/api/complaints', req),
  getComplaints:       (email?: string): Promise<{ complaints: ComplaintResponse[] }> => get(email ? `/api/complaints?email=${encodeURIComponent(email)}` : '/api/complaints'),
  acknowledgeComplaint:(id: number): Promise<ComplaintResponse> => patch(`/api/complaints/${id}/acknowledge`),
  updateComplaintStatus:(id: number, status: string): Promise<ComplaintResponse> => patch(`/api/complaints/${id}/status`, { status }),
  endorseComplaint:    (id: number): Promise<{ status: string; id: number; impact_count: number }> => post(`/api/complaints/${id}/endorse`, {}),
  importCSV:           (items: unknown[]): Promise<{ status: string; imported: number }> => post('/api/complaints/import-csv', { items }),
  importComplaintsCsv: async (file: File): Promise<{ status: string; imported_count: number }> => {
    const text = await file.text()
    const lines = text.split('\n').filter(l => l.trim().length > 0)
    if (lines.length <= 1) return { status: 'empty', imported_count: 0 }
    
    const items = []
    for (let i = 1; i < lines.length; i++) {
      const parts = lines[i].split(',').map(p => p.trim().replace(/^"|"$/g, ''))
      if (parts.length >= 2) {
        items.push({
          village: parts[0] || 'Pune Feeder',
          category: parts[1] || 'Power Outage',
          description: parts[2] || 'Imported via Admin CSV Triage',
          section_id: Number(parts[3]) || 1,
        })
      }
    }
    
    const res = await post('/api/complaints/import-csv', { items })
    return { status: 'success', imported_count: (res as { imported?: number }).imported ?? items.length }
  },
  getAuditLogs:        (): Promise<{ audit_logs: import('../types').AuditLog[] }> => get('/api/complaints/audit-logs'),

  // Health
  health:              (): Promise<{ status: string; mock_mode: boolean }> => get('/health'),
}

