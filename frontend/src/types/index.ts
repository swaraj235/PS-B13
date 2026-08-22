// ── Shared type definitions (mirrors backend/shared/schemas.py) ────────────

export interface SensorReading {
  section_id:    number;
  timestamp:     string;
  voltage_pu:    number;
  current_A:     number;
  temp_C:        number;
  thd_pct:       number;
  power_factor:  number;
  anomaly_score: number;
}

export interface SectionResult {
  id:                number;
  fault_probability: number;
  status:            'normal' | 'warning' | 'critical';
}

export interface LocalizeResponse {
  timestamp: string;
  sections:  SectionResult[];
}

export interface FaultCandidate {
  type:        string;
  probability: number;
}

export interface ClassifyResponse {
  section_id:   number;
  fault_type:   string;
  confidence:   number;
  candidates:   FaultCandidate[];
  triggered_at: string;
}

export interface SHAPReason {
  feature:      string;
  feature_key:  string;
  contribution: number;
  value:        number;
  direction:    'increase_risk' | 'decrease_risk';
}

export interface ExplainResponse {
  section_id:  number;
  fault_type:  string;
  top_reasons: SHAPReason[];
  summary:     string;
}

export interface TowerReading {
  id:          string;
  tfr_ohm:     number;
  ert_anomaly: boolean;
  status:      'normal' | 'warning' | 'critical';
  lat:         number;
  lon:         number;
}

export interface TerraShieldResponse {
  towers:    TowerReading[];
  timestamp: string;
}

export interface SwitchStep {
  step_number:  number;
  action:       string;
  switch_id:    string;
  safety_check: string;
  restores:     string[];
}

export interface SwitchingGuideResponse {
  fault_section_id:           number;
  total_steps:                number;
  steps:                      SwitchStep[];
  affected_villages:          string[];
  estimated_restore_time_min: number;
}

export interface User {
  id:        number;
  email:     string;
  full_name: string;
  role:      'consumer' | 'admin';
  zone_id:   number;
  phone?:    string;
  avatar_data?: string;
}

export interface AuthResponse {
  access_token: string;
  token_type:   string;
  user:         User;
}

export interface ComplaintRequest {
  village:     string;
  category?:   string;
  description?:string;
  section_id?: number;
  image_data?: string;
}

export interface ComplaintResponse {
  id:            number;
  user_id?:      number;
  email?:        string;
  consumer_name?:string;
  section_id:    number;
  village:       string;
  category?:     string;
  description?:  string;
  image_data?:   string;
  status:        'pending' | 'in_progress' | 'resolved';
  submitted_at:  string;
  resolved_at?:  string;
  acknowledged:  boolean;
  impact_count?: number;
  duplicate_merged?: boolean;
  message?:      string;
}

export interface AuditLog {
  id:           number;
  complaint_id: number | null;
  action:       string;
  details:      string;
  performed_by: string;
  timestamp:    string;
}


export interface WSMessage {
  type: 'sensor_reading' | 'fault_alert' | 'heartbeat';
  data?: SensorReading | ClassifyResponse;
  uptime_sec?: number;
}

export type SectionStatus = 'normal' | 'warning' | 'critical';
export type FaultTypeKey =
  | 'conductor_damage'
  | 'transformer_overload'
  | 'vegetation_contact'
  | 'illegal_tap'
  | 'grounding_fault'
  | 'normal';
