import { useState } from 'react'
import { MapPin, CheckSquare, Square, AlertTriangle, Navigation, ChevronRight } from 'lucide-react'
import { useGridStore } from '../store/gridStore'
import { faultTypeLabel } from '../lib/utils'

const SUBSTATION_COORDS: Record<number, { name: string; coords: string; eta: string }> = {
  1: { name: 'Kothrud 11kV Substation', coords: '18.5074° N, 73.8077° E', eta: '8 min' },
  2: { name: 'Paud Rd Branch Substation', coords: '18.5158° N, 73.8130° E', eta: '10 min' },
  3: { name: 'Kondhwa 22/11kV Substation', coords: '18.4722° N, 73.8860° E', eta: '14 min' },
  4: { name: 'Hadapsar 22kV Industrial Sub', coords: '18.5089° N, 73.9259° E', eta: '12 min' },
  5: { name: 'Swargate 11kV Central Sub', coords: '18.5018° N, 73.8586° E', eta: '6 min' },
}

const SAFETY_CHECKS = [
  'PPE equipment donned',
  'Work permit obtained',
  'Area cordoned off',
  'Lockout/Tagout applied',
  'Crew member notified',
]

export default function CrewView() {
  const { activeAlert, selectedSectionId, switchSteps, affectedVillages, sections } = useGridStore()
  const [checked, setChecked] = useState<boolean[]>(SAFETY_CHECKS.map((_, i) => i < 2))
  const [currentStep, setCurrentStep] = useState(1)
  const [dispatched, setDispatched] = useState(false)

  const activeSecId = activeAlert?.section_id || selectedSectionId || 3
  const activeSubstation = SUBSTATION_COORDS[activeSecId] || SUBSTATION_COORDS[3]
  const currentSecObj = sections.find(s => s.id === activeSecId)

  const toggle = (i: number) => setChecked(c => c.map((v, idx) => idx === i ? !v : v))
  const doneCount = checked.filter(Boolean).length

  return (
    <div className="flex flex-col h-full overflow-hidden bg-navy-900">
      {/* Mobile Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/5 bg-navy-800 flex-shrink-0">
        <div className="flex items-center gap-2">
          <div>
            <h2 className="font-head font-semibold text-white text-base">Field Crew Operator View</h2>
            <p className="text-xs text-gray-400">Pune Circle MSEDCL Mobile Dispatch</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={`px-2.5 py-1 rounded-full text-[10px] font-mono border font-bold ${
            currentSecObj?.status === 'critical'
              ? 'bg-fault-critical/15 border-fault-critical/30 text-fault-critical animate-pulse'
              : 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
          }`}>
            SEC {activeSecId} ({currentSecObj?.status?.toUpperCase() || 'NORMAL'})
          </span>
          <div className="w-8 h-8 rounded-full bg-electric/20 flex items-center justify-center text-xs font-bold text-electric">
            MS
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-lg mx-auto p-4 space-y-4">

          {/* Fault Assignment */}
          <div className={`card border-l-4 ${currentSecObj?.status === 'critical' ? 'border-l-fault-critical shadow-glow-red' : 'border-l-electric'} animate-fade-in`}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <AlertTriangle className={`w-5 h-5 ${currentSecObj?.status === 'critical' ? 'text-fault-critical animate-pulse' : 'text-electric'}`} />
                <span className="font-head font-bold text-white text-base">
                  {currentSecObj?.status === 'critical' ? 'ACTIVE INCIDENT ASSIGNMENT' : `SECTION ${activeSecId} STATUS OK`}
                </span>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-navy-700 text-electric border border-electric/20">
                {activeSubstation.name}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-4">
              {[
                ['Section ID', `Section ${activeSecId}`],
                ['Fault Type', activeAlert ? faultTypeLabel(activeAlert.fault_type) : 'System Normal'],
                ['Triggered', activeAlert ? activeAlert.triggered_at.slice(11, 19) + ' UTC' : 'N/A'],
                ['Confidence', activeAlert ? `${(activeAlert.confidence * 100).toFixed(1)}%` : '99.9%'],
              ].map(([k, v]) => (
                <div key={k}>
                  <p className="text-[10px] text-gray-500">{k}</p>
                  <p className="text-sm font-semibold text-white font-mono">{v}</p>
                </div>
              ))}
            </div>

            <div className="mb-4 p-3 bg-navy-800 rounded-lg border border-white/5 flex items-center justify-between">
              <div>
                <p className="text-[10px] text-gray-500 mb-0.5 flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-electric" /> Substation GPS Coordinates
                </p>
                <p className="text-xs font-mono text-electric font-bold">{activeSubstation.coords}</p>
              </div>
              <span className="text-[10px] text-amber-400 font-mono bg-amber-400/10 px-2 py-1 rounded border border-amber-400/20">
                ETA: {activeSubstation.eta}
              </span>
            </div>

            <button
              onClick={() => setDispatched(v => !v)}
              className={`w-full flex items-center justify-center gap-2 py-3 text-sm rounded-xl font-bold transition-all ${
                dispatched
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  : 'btn-primary'
              }`}
            >
              <Navigation className="w-4 h-4" />
              {dispatched ? '✓ Field Crew En Route (Tracking Active)' : `Dispatch Crew to Section ${activeSecId}`}
            </button>
          </div>

          {/* Safety Checklist */}
          <div className="card">
            <div className="card-header">
              <CheckSquare className="w-4 h-4 text-electric" />
              Pre-Work Safety Protocol
              <span className="ml-auto text-xs font-mono text-gray-400">{doneCount}/{SAFETY_CHECKS.length}</span>
            </div>
            <div className="mb-3 h-1.5 bg-navy-500 rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                style={{ width: `${(doneCount / SAFETY_CHECKS.length) * 100}%` }}
              />
            </div>
            <div className="space-y-2">
              {SAFETY_CHECKS.map((check, i) => (
                <button
                  key={i}
                  onClick={() => toggle(i)}
                  className={`w-full flex items-center gap-3 p-2.5 rounded-lg text-left border transition-all duration-200
                    ${checked[i]
                      ? 'border-emerald-500/30 bg-emerald-500/5'
                      : 'border-white/5 hover:bg-white/5'
                    }`}
                >
                  {checked[i]
                    ? <CheckSquare className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                    : <Square      className="w-4 h-4 text-gray-500 flex-shrink-0" />
                  }
                  <span className={`text-sm ${checked[i] ? 'text-emerald-300 font-medium' : 'text-gray-300'}`}>
                    {check}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Switching Steps */}
          {switchSteps.length > 0 && (
            <div className="card">
              <div className="card-header">
                <ChevronRight className="w-4 h-4 text-electric" />
                Isolation & Tie Switching Sequence
                <span className="ml-auto text-xs font-mono text-gray-400">Step {currentStep}/{switchSteps.length}</span>
              </div>
              <div className="space-y-2">
                {switchSteps.map((step, idx) => {
                  const state = idx + 1 < currentStep ? 'done' : idx + 1 === currentStep ? 'active' : 'pending'
                  return (
                    <div key={step.step_number} className={`p-3 rounded-lg border ${
                      state === 'done'   ? 'border-emerald-500/30  bg-emerald-500/5'  :
                      state === 'active' ? 'border-amber-500/40 bg-amber-500/5' :
                                          'border-white/5 opacity-50'}`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded font-bold
                          ${state === 'done' ? 'bg-emerald-500/20 text-emerald-400' :
                            state === 'active' ? 'bg-amber-500/20 text-amber-400' : 'bg-gray-700 text-gray-400'}`}
                        >
                          {state === 'done' ? '✓ DONE' : state === 'active' ? '⟳ ACTIVE' : 'PENDING'}
                        </span>
                        <span className="text-[10px] font-mono text-electric font-bold">{step.switch_id}</span>
                      </div>
                      <p className="text-sm text-white font-medium">{step.action}</p>
                      <p className="text-[10px] text-gray-400 mt-0.5">Safety verification: {step.safety_check}</p>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Affected Villages */}
          {affectedVillages.length > 0 && (
            <div className="card">
              <p className="card-header">
                <MapPin className="w-4 h-4 text-electric" />
                Affected Sub-Areas
              </p>
              <div className="flex flex-wrap gap-2">
                {affectedVillages.map(v => (
                  <span key={v} className="px-3 py-1 rounded-full bg-fault-critical/10 text-fault-critical text-xs border border-fault-critical/20 font-mono font-bold">
                    {v}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Action Bar */}
      <div className="flex gap-3 p-4 border-t border-white/5 bg-navy-800 flex-shrink-0">
        <button
          onClick={() => setCurrentStep(s => Math.min(s + 1, switchSteps.length || 1))}
          className="flex-1 py-3 bg-electric text-navy-900 font-bold rounded-xl text-sm hover:bg-cyan-400 transition-all active:scale-95 shadow-glow-blue"
        >
          ✓ Mark Switching Step {currentStep} Complete
        </button>
      </div>
    </div>
  )
}
