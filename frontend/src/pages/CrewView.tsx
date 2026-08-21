import { useState } from 'react'
import { MapPin, CheckSquare, Square, AlertTriangle, Navigation, ChevronRight } from 'lucide-react'
import { useGridStore } from '../store/gridStore'
import { faultTypeLabel } from '../lib/utils'

const SAFETY_CHECKS = [
  'PPE equipment donned',
  'Work permit obtained',
  'Area cordoned off',
  'Lockout/Tagout applied',
  'Crew member notified',
]

export default function CrewView() {
  const { activeAlert, switchSteps, affectedVillages } = useGridStore()
  const [checked, setChecked] = useState<boolean[]>(SAFETY_CHECKS.map((_, i) => i < 2))
  const [currentStep, setCurrentStep] = useState(1)

  const toggle = (i: number) => setChecked(c => c.map((v, idx) => idx === i ? !v : v))
  const doneCount = checked.filter(Boolean).length

  return (
    <div className="flex flex-col h-full overflow-hidden bg-navy-900">
      {/* Mobile Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/5 bg-navy-800 flex-shrink-0">
        <div className="flex items-center gap-2">
          <button className="text-gray-400 hover:text-white">←</button>
          <div>
            <h2 className="font-head font-semibold text-white text-base">Field Crew View</h2>
            <p className="text-xs text-gray-500">Mobile Operator Interface</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {activeAlert && (
            <span className="px-2 py-1 rounded-full bg-fault-critical/15 border border-fault-critical/30 text-fault-critical text-[10px] font-mono animate-pulse">
              SEC {activeAlert.section_id}
            </span>
          )}
          <div className="w-8 h-8 rounded-full bg-electric/20 flex items-center justify-center text-xs font-bold text-electric">
            RK
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-lg mx-auto p-4 space-y-4">

          {/* Fault Assignment */}
          {activeAlert ? (
            <div className="card border-l-4 border-l-fault-critical shadow-glow-red animate-fade-in">
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle className="w-5 h-5 text-fault-critical animate-pulse" />
                <span className="font-head font-bold text-fault-critical text-base">CRITICAL FAULT</span>
              </div>
              <div className="grid grid-cols-2 gap-3 mb-4">
                {[
                  ['Section',   `Section ${activeAlert.section_id}`],
                  ['Fault Type', faultTypeLabel(activeAlert.fault_type)],
                  ['Triggered',  activeAlert.triggered_at.slice(11, 19) + ' UTC'],
                  ['Confidence', `${(activeAlert.confidence * 100).toFixed(1)}%`],
                ].map(([k, v]) => (
                  <div key={k}>
                    <p className="text-[10px] text-gray-500">{k}</p>
                    <p className="text-sm font-semibold text-white font-mono">{v}</p>
                  </div>
                ))}
              </div>
              <div className="mb-4 p-2 bg-navy-800 rounded-lg border border-white/5">
                <p className="text-[10px] text-gray-500 mb-1 flex items-center gap-1">
                  <MapPin className="w-3 h-3" /> GPS Coordinates
                </p>
                <p className="text-sm font-mono text-electric">18.5300°N, 73.8500°E</p>
              </div>
              <button className="btn-primary w-full flex items-center justify-center gap-2 py-3 text-sm">
                <Navigation className="w-4 h-4" />
                Navigate to Fault (~12 min)
              </button>
            </div>
          ) : (
            <div className="card text-center py-8 text-gray-500">
              <AlertTriangle className="w-8 h-8 mx-auto mb-2 opacity-40" />
              <p>No active fault assignment</p>
            </div>
          )}

          {/* Safety Checklist */}
          <div className="card">
            <div className="card-header">
              <CheckSquare className="w-4 h-4 text-electric" />
              Pre-Work Safety Check
              <span className="ml-auto text-xs font-mono text-gray-400">{doneCount}/{SAFETY_CHECKS.length}</span>
            </div>
            <div className="mb-3 h-1.5 bg-navy-500 rounded-full overflow-hidden">
              <div
                className="h-full bg-fault-normal rounded-full transition-all duration-500"
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
                      ? 'border-fault-normal/30 bg-fault-normal/5'
                      : 'border-white/5 hover:bg-white/5'
                    }`}
                >
                  {checked[i]
                    ? <CheckSquare className="w-4 h-4 text-fault-normal flex-shrink-0" />
                    : <Square      className="w-4 h-4 text-gray-500 flex-shrink-0" />
                  }
                  <span className={`text-sm ${checked[i] ? 'text-fault-normal' : 'text-gray-300'}`}>
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
                Switching Sequence
                <span className="ml-auto text-xs font-mono text-gray-400">Step {currentStep}/{switchSteps.length}</span>
              </div>
              <div className="space-y-2">
                {switchSteps.map((step, idx) => {
                  const state = idx + 1 < currentStep ? 'done' : idx + 1 === currentStep ? 'active' : 'pending'
                  return (
                    <div key={step.step_number} className={`p-3 rounded-lg border ${
                      state === 'done'   ? 'border-fault-normal/30  bg-fault-normal/5'  :
                      state === 'active' ? 'border-fault-warning/40 bg-fault-warning/5' :
                                          'border-white/5 opacity-50'}`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded
                          ${state === 'done' ? 'bg-fault-normal/20 text-fault-normal' :
                            state === 'active' ? 'bg-fault-warning/20 text-fault-warning' : 'bg-gray-700 text-gray-400'}`}
                        >
                          {state === 'done' ? '✓ DONE' : state === 'active' ? '⟳ ACTIVE' : 'PENDING'}
                        </span>
                        <span className="text-[10px] font-mono text-electric">{step.switch_id}</span>
                      </div>
                      <p className="text-sm text-white font-medium">{step.action}</p>
                      <p className="text-[10px] text-gray-500 mt-0.5">{step.safety_check}</p>
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
                Affected Areas
              </p>
              <div className="flex flex-wrap gap-2">
                {affectedVillages.map(v => (
                  <span key={v} className="px-3 py-1 rounded-full bg-fault-critical/10 text-fault-critical text-xs border border-fault-critical/20 font-mono">
                    {v}
                  </span>
                ))}
              </div>
              <p className="text-xs text-gray-500 mt-2">~2,400 consumers affected</p>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Action Bar */}
      <div className="flex gap-3 p-4 border-t border-white/5 bg-navy-800 flex-shrink-0">
        <button
          onClick={() => setCurrentStep(s => Math.min(s + 1, switchSteps.length))}
          className="flex-1 py-3 bg-fault-warning text-navy-900 font-bold rounded-xl text-sm hover:bg-amber-400 transition-all active:scale-95"
        >
          ✓ Mark Step {currentStep} Complete
        </button>
        <button className="px-4 py-3 border border-white/10 text-gray-300 rounded-xl text-sm hover:bg-white/5 transition-all">
          Report Issue
        </button>
      </div>
    </div>
  )
}
