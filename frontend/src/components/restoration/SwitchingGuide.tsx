import { useState } from 'react'
import { CheckCircle2, Loader2, Circle, ListChecks, MapPin, Zap, AlertTriangle, Users } from 'lucide-react'
import { useGridStore } from '../../store/gridStore'

// Comprehensive sub-area mapping per feeder section
const SECTION_AREAS: Record<number, { name: string; villages: string[]; consumers: string; criticalLoad: string }> = {
  1: {
    name: 'Section 1 (Primary Substation Outlet)',
    villages: ['Kothrud Central', 'Karve Nagar', 'Warje Malwadi', 'Erandwane'],
    consumers: '14,200',
    criticalLoad: 'Sahyadri Hospital, Karve Rd Metro Stn'
  },
  2: {
    name: 'Section 2 (Mid-Feeder Branch A)',
    villages: ['Paud Road', 'Ideal Colony', 'Bavdhan Khurd', 'Bhugaon'],
    consumers: '11,800',
    criticalLoad: 'MIT Campus, Water Treatment Plant'
  },
  3: {
    name: 'Section 3 (Mid-Feeder Branch B)',
    villages: ['Kondhwa Budruk', 'Kondhwa Khurd', 'Undri', 'Pisoli', 'NIBM Rd'],
    consumers: '16,500',
    criticalLoad: 'Kondhwa Fire Stn, Ruby Hall Clinic'
  },
  4: {
    name: 'Section 4 (Industrial & Commercial Link)',
    villages: ['Katraj-Kondhwa Bypass', 'Yeolewadi', 'Saswad Road', 'Handewadi'],
    consumers: '9,400',
    criticalLoad: 'Hadapsar Industrial Zone B'
  },
  5: {
    name: 'Section 5 (Feeder End-Node / Tie-Point)',
    villages: ['Bhavani Peth', 'Camp Market', 'Parvati Hill', 'Swargate Terminal'],
    consumers: '8,100',
    criticalLoad: 'MSEDCL Regional Switching Sub'
  }
}

export function SwitchingGuide() {
  const { switchSteps, affectedVillages, estimatedRestoreMin, selectedSectionId, sections } = useGridStore()
  const [completedSteps, setCompletedSteps] = useState<Record<number, boolean>>({})

  const activeSectionInfo = SECTION_AREAS[selectedSectionId] || SECTION_AREAS[1]
  const currentSection = sections.find(s => s.id === selectedSectionId)
  const isFaulted = currentSection?.status === 'critical' || currentSection?.status === 'warning' || switchSteps.length > 0

  const toggleStep = (stepNum: number) => {
    setCompletedSteps(prev => ({
      ...prev,
      [stepNum]: !prev[stepNum]
    }))
  }

  const allCompleted = switchSteps.length > 0 && switchSteps.every(s => completedSteps[s.step_number])

  // Combine store affected villages with section area defaults
  const displayVillages = affectedVillages.length > 0 ? affectedVillages : activeSectionInfo.villages

  return (
    <div className="card flex flex-col gap-3 animate-fade-in">
      {/* Panel Header */}
      <div className="card-header justify-between">
        <div className="flex items-center gap-2">
          <ListChecks className="w-4 h-4 text-electric" />
          <span className="text-white font-semibold">Restoration & Impact Guide — SEC {selectedSectionId}</span>
        </div>
        {isFaulted && estimatedRestoreMin > 0 && (
          <span className="text-xs text-electric font-mono font-bold px-2 py-0.5 rounded bg-electric/10 border border-electric/20">
            EST: ~{estimatedRestoreMin} MIN
          </span>
        )}
      </div>

      {/* Affected Places / Impact Summary Card */}
      <div className={`p-3 rounded-xl border flex flex-col gap-2 ${
        isFaulted 
          ? 'bg-red-500/10 border-red-500/30' 
          : 'bg-navy-800/60 border-white/10'
      }`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs font-bold text-gray-200">
            <MapPin className={`w-3.5 h-3.5 ${isFaulted ? 'text-red-400' : 'text-electric'}`} />
            <span>{isFaulted ? '🚨 Outage Impacted Sub-Areas & Villages' : '📍 Connected Sub-Areas & Villages'}</span>
          </div>
          <span className="text-[10px] text-gray-400 font-mono flex items-center gap-1">
            <Users className="w-3 h-3 text-electric" /> {activeSectionInfo.consumers} Consumers
          </span>
        </div>

        {/* Badges for Villages */}
        <div className="flex flex-wrap gap-1.5 mt-0.5">
          {displayVillages.map(v => (
            <span
              key={v}
              className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-md border ${
                isFaulted
                  ? 'bg-red-500/20 text-red-300 border-red-500/40 animate-pulse'
                  : 'bg-electric/10 text-electric border-electric/30'
              }`}
            >
              {v}
            </span>
          ))}
        </div>

        {/* Critical Load note */}
        <div className="text-[10px] text-gray-400 flex items-center justify-between border-t border-white/5 pt-1.5 mt-0.5">
          <span className="truncate">🏥 Critical Feed: <strong className="text-gray-300">{activeSectionInfo.criticalLoad}</strong></span>
          <span className={`font-mono font-bold px-1.5 py-0.5 rounded ${
            isFaulted ? 'bg-red-500/20 text-red-400' : 'bg-emerald-500/10 text-emerald-400'
          }`}>
            {isFaulted ? 'STATUS: OUTAGE' : 'STATUS: NORMAL'}
          </span>
        </div>
      </div>

      {/* Switching Steps Plan */}
      {switchSteps.length === 0 ? (
        <div className="text-center py-4 text-gray-400 text-xs bg-navy-900/40 rounded-xl border border-white/5 p-3">
          <p className="font-semibold text-gray-300">✓ Feeder Section {selectedSectionId} is healthy</p>
          <p className="text-[11px] text-gray-500 mt-1">
            In the event of an electrical fault, automated isolator switching protocols and power rerouting steps will populate here automatically.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {allCompleted && (
            <div className="p-3 rounded-lg bg-fault-normal/15 border border-fault-normal/40 text-fault-normal flex items-center justify-between text-xs font-semibold animate-pulse">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4" />
                <span>✓ All switching steps complete! Section ready for energization.</span>
              </div>
              <button
                onClick={() => setCompletedSteps({})}
                className="px-2 py-1 rounded bg-fault-normal text-navy-900 font-bold hover:bg-fault-normal/80 transition"
              >
                Reset
              </button>
            </div>
          )}

          {switchSteps.map((step, idx) => {
            const isDone = !!completedSteps[step.step_number]
            const isCurrent = !isDone && (idx === 0 || completedSteps[switchSteps[idx - 1]?.step_number])

            return (
              <div
                key={step.step_number}
                onClick={() => toggleStep(step.step_number)}
                className={`p-3 rounded-lg border transition-all duration-200 cursor-pointer select-none ${
                  isDone
                    ? 'border-fault-normal/40 bg-fault-normal/10'
                    : isCurrent
                    ? 'border-fault-warning/60 bg-fault-warning/10 shadow-glow-amber scale-[1.01]'
                    : 'border-white/5 bg-navy-800/40 opacity-70 hover:opacity-100'
                }`}
              >
                <div className="flex items-start gap-2.5">
                  <div className="flex-shrink-0 mt-0.5">
                    {isDone ? (
                      <CheckCircle2 className="w-4.5 h-4.5 text-fault-normal" />
                    ) : isCurrent ? (
                      <Loader2 className="w-4.5 h-4.5 text-fault-warning animate-spin" />
                    ) : (
                      <Circle className="w-4.5 h-4.5 text-gray-500" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono text-gray-400 font-bold">STEP {step.step_number}</span>
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-navy-700 text-electric border border-electric/30 font-bold">
                          {step.switch_id}
                        </span>
                      </div>
                      <span className="text-[10px] text-gray-400 font-mono">
                        {isDone ? 'COMPLETED' : isCurrent ? 'ACTION REQUIRED' : 'PENDING'}
                      </span>
                    </div>
                    <p className={`text-xs mt-1 font-semibold ${isDone ? 'text-fault-normal line-through opacity-80' : isCurrent ? 'text-white' : 'text-gray-300'}`}>
                      {step.action}
                    </p>
                    <p className="text-[10px] text-gray-400 mt-0.5 leading-tight">{step.safety_check}</p>
                    {step.restores.length > 0 && (
                      <p className="text-[10px] text-fault-normal font-medium mt-1">
                        ✓ Restores power to: {step.restores.join(', ')}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
