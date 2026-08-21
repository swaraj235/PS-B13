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
} from '../types'

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`)
  if (!res.ok) throw new Error(`API error ${res.status}: ${path}`)
  return res.json()
}

async function post<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(body),
  })
  if (!res.ok) throw new Error(`API error ${res.status}: ${path}`)
  return res.json()
}

async function patch<T>(path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method:  'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body:    body ? JSON.stringify(body) : undefined,
  })
  if (!res.ok) throw new Error(`API error ${res.status}: ${path}`)
  return res.json()
}

export const api = {
  // Fault
  getFaultLocalize:  (): Promise<LocalizeResponse>      => get('/api/fault/localize'),
  getFaultClassify:  (sectionId: number): Promise<ClassifyResponse>  => get(`/api/fault/classify?section_id=${sectionId}`),
  injectFault:       (sectionId: number, faultType: FaultTypeKey)    => post('/api/fault/inject', { section_id: sectionId, fault_type: faultType }),

  // SHAP explanation
  getExplain:        (sectionId: number): Promise<ExplainResponse>   => get(`/api/explain?section_id=${sectionId}`),

  // TerraShield
  getTerraShield:    (): Promise<TerraShieldResponse>   => get('/api/terrashield/status'),

  // GIS
  getFaultOverlay:   (): Promise<unknown>               => get('/api/gis/fault-overlay'),
  getCrewRoute:      (sectionId: number): Promise<unknown> => get(`/api/gis/crew-route?section_id=${sectionId}`),

  // Switching
  getSwitchingGuide: (sectionId: number): Promise<SwitchingGuideResponse> => get(`/api/switching/guide?section_id=${sectionId}`),

  // Villages
  getAffectedVillages: (sectionId: number): Promise<{ villages: string[] }> => get(`/api/villages/affected?section_id=${sectionId}`),

  // Complaints
  submitComplaint:     (req: ComplaintRequest): Promise<ComplaintResponse> => post('/api/complaints', req),
  getComplaints:       (): Promise<{ complaints: ComplaintResponse[] }> => get('/api/complaints'),
  acknowledgeComplaint:(id: number): Promise<ComplaintResponse> => patch(`/api/complaints/${id}/acknowledge`),

  // Health
  health:              (): Promise<{ status: string; mock_mode: boolean }> => get('/health'),
}
