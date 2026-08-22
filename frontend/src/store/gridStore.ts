import { create } from 'zustand'
import type {
  SensorReading, SectionResult, ClassifyResponse,
  ExplainResponse, TowerReading, SwitchStep,
  ComplaintResponse, ComplaintRequest,
} from '../types'
import type { FaultTypeKey } from '../types'
import { api } from '../lib/api'

const MAX_HISTORY = 60
const MAX_ALERTS  = 20

interface GridStore {
  // Live sensor data
  sensorHistory:  Record<number, SensorReading[]>
  latestReadings: Record<number, SensorReading>

  // Fault state
  sections:    SectionResult[]
  activeAlert: ClassifyResponse | null
  alerts:      ClassifyResponse[]

  // Explanation
  explanation: ExplainResponse | null
  loadExplanation: (sectionId: number) => Promise<void>

  // TerraShield
  towers: TowerReading[]

  // GIS
  geoJSON: unknown | null

  // Switching
  switchSteps:      SwitchStep[]
  affectedVillages: string[]
  estimatedRestoreMin: number
  loadSwitchingGuide: (sectionId: number) => Promise<void>

  // Complaints
  complaints:      ComplaintResponse[]
  submitComplaint: (req: ComplaintRequest) => Promise<void>
  loadComplaints:  () => Promise<void>

  // WebSocket
  wsConnected: boolean
  wsUptime:    number

  // Internal setters (called by hooks)
  _setSections:    (s: SectionResult[]) => void
  _setTowers:      (t: TowerReading[]) => void
  _setGeoJSON:     (g: unknown) => void
  _addSensorReading: (r: SensorReading) => void
  _addAlert:       (a: ClassifyResponse) => void
  _setConnected:   (c: boolean) => void
  _setUptime:      (u: number) => void

  // Section Selection
  selectedSectionId: number
  setSelectedSectionId: (id: number) => void

  // Demo
  injectFault: (sectionId: number, faultType: FaultTypeKey) => Promise<void>
  resetFault:  () => Promise<void>
}

export const useGridStore = create<GridStore>((set, get) => ({
  sensorHistory:  {},
  latestReadings: {},
  sections:       [],
  activeAlert:    null,
  alerts:         [],
  explanation:    null,
  towers:         [],
  geoJSON:        null,
  switchSteps:    [],
  affectedVillages: [],
  estimatedRestoreMin: 0,
  complaints:     [],
  wsConnected:    false,
  wsUptime:       0,
  selectedSectionId: 3,

  setSelectedSectionId: (id: number) => {
    set({ selectedSectionId: id })
    get().loadExplanation(id)
    get().loadSwitchingGuide(id)
  },

  loadExplanation: async (sectionId) => {
    try {
      const data = await api.getExplain(sectionId)
      set({ explanation: data })
    } catch (e) {
      console.error('Failed to load explanation', e)
    }
  },

  loadSwitchingGuide: async (sectionId) => {
    try {
      const data = await api.getSwitchingGuide(sectionId)
      set({
        switchSteps:      data.steps,
        affectedVillages: data.affected_villages,
        estimatedRestoreMin: data.estimated_restore_time_min,
      })
    } catch (e) {
      console.error('Failed to load switching guide', e)
    }
  },

  loadComplaints: async () => {
    try {
      const data = await api.getComplaints()
      set({ complaints: data.complaints || [] })
    } catch (e) {
      console.error('Failed to load complaints', e)
    }
  },

  submitComplaint: async (req) => {
    const res = await api.submitComplaint(req)
    set(s => ({ complaints: [res, ...s.complaints].slice(0, 50) }))
  },

  injectFault: async (sectionId, faultType) => {
    await api.injectFault(sectionId, faultType)
    set(s => ({
      selectedSectionId: sectionId,
      sections: s.sections.map(sec => sec.id === sectionId ? { ...sec, status: 'critical' as const, fault_probability: 0.942 } : sec)
    }))
    get().loadExplanation(sectionId)
    get().loadSwitchingGuide(sectionId)
  },

  resetFault: async () => {
    await api.resetFault()
    try {
      const localize = await api.getFaultLocalize()
      set({
        sections: localize.sections,
        activeAlert: null,
        alerts: [],
        switchSteps: [],
        affectedVillages: [],
        estimatedRestoreMin: 0
      })
    } catch (e) {
      console.error('Failed to reset fault', e)
    }
  },

  // Internal setters
  _setSections: (sections) => set({ sections }),
  _setTowers:   (towers)   => set({ towers }),
  _setGeoJSON:  (geoJSON)  => set({ geoJSON }),

  _addSensorReading: (r) => set(s => {
    const history = s.sensorHistory[r.section_id] ?? []
    return {
      latestReadings: { ...s.latestReadings, [r.section_id]: r },
      sensorHistory:  {
        ...s.sensorHistory,
        [r.section_id]: [...history, r].slice(-MAX_HISTORY),
      },
    }
  }),

  _addAlert: (a) => set(s => {
    const newSelected = a.section_id
    get().loadExplanation(newSelected)
    get().loadSwitchingGuide(newSelected)
    const updatedSections = s.sections.map(sec =>
      sec.id === newSelected ? { ...sec, status: 'critical' as const, fault_probability: 0.942 } : sec
    )
    return {
      activeAlert: a,
      alerts:      [a, ...s.alerts].slice(0, MAX_ALERTS),
      selectedSectionId: newSelected,
      sections:    updatedSections,
    }
  }),

  _setConnected: (c) => set({ wsConnected: c }),
  _setUptime:    (u) => set({ wsUptime: u }),
}))
