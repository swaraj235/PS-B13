import { useState, useEffect } from 'react'
import { CheckCircle2, Loader2, Circle, ListChecks, MapPin, Zap, Users, ShieldCheck } from 'lucide-react'
import { useGridStore } from '../../store/gridStore'
import { SECTION_NAMES } from '../../lib/constants'

// Section-specific metadata lookup
const SECTION_AREAS: Record<number, { name: string; villages: string[]; consumers: string; criticalLoad: string }> = {
  1: {
    name: 'Feeder Section 1 (Kothrud Bus)',
    villages: ['Kothrud Central', 'Karve Nagar', 'Warje Malwadi', 'Erandwane'],
    consumers: '14,200',
    criticalLoad: 'Sahyadri Hospital, Karve Rd Metro Stn'
  },
  2: {
    name: 'Feeder Section 2 (Paud Rd Branch)',
    villages: ['Paud Road', 'Ideal Colony', 'Bavdhan Khurd', 'Bhugaon'],
    consumers: '11,800',
    criticalLoad: 'MIT Campus, Water Treatment Plant'
  },
  3: {
    name: 'Feeder Section 3 (Kondhwa Commercial)',
    villages: ['Kondhwa Budruk', 'Kondhwa Khurd', 'Undri', 'Pisoli', 'NIBM Rd'],
    consumers: '16,500',
    criticalLoad: 'Kondhwa Fire Stn, Ruby Hall Clinic'
  },
  4: {
    name: 'Feeder Section 4 (Hadapsar Industrial)',
    villages: ['Hadapsar', 'Magarpatta', 'Amanora', 'Mundhwa Industrial'],
    consumers: '19,400',
    criticalLoad: 'Hadapsar Industrial Park, Noble Hospital'
  },
  5: {
    name: 'Feeder Section 5 (Swargate Core Tail)',
    villages: ['Bhavani Peth', 'Camp Market', 'Parvati Hill', 'Swargate Terminal'],
    consumers: '8,100',
    criticalLoad: 'MSEDCL Regional Switching Sub'
  }
}

export function SwitchingGuide() {
  const { switchSteps, affectedVillages, estimatedRestoreMin, selectedSectionId, sections, loadSwitchingGuide } = useGridStore()
  const [completedSteps, setCompletedSteps] = useState<Record<number, boolean>>({})

  // Reset completed steps when section changes & fetch section-specific guide
  useEffect(() => {
    setCompletedSteps({})
    loadSwitchingGuide(selectedSectionId)
  }, [selectedSectionId])

  const activeSectionInfo = SECTION_AREAS[selectedSectionId] || SECTION_AREAS[1]
  const zoneInfo = SECTION_NAMES[selectedSectionId] || { title: `Section ${selectedSectionId}` }
  const currentSection = sections.find(s => s.id === selectedSectionId)

  // ONLY mark as faulted if section status is explicitly 'critical' or 'warning'
  const isFaulted = currentSection?.status === 'critical' || currentSection?.status === 'warning'

  const toggleStep = (stepNum: number) => {
    setCompletedSteps(prev => ({
      ...prev,
      [stepNum]: !prev[stepNum]
    }))
  }

  const allCompleted = switchSteps.length > 0 && switchSteps.every(s => completedSteps[s.step_number])

  // Dynamically resolve villages per section
  const displayVillages = (affectedVillages.length > 0 && affectedVillages[0] !== 'Vadgaon') 
    ? affectedVillages 
    : activeSectionInfo.villages

  return (
    <div className="card flex flex-col gap-3 bg-[#0d1626] border border-electric/20 rounded-2xl p-5 shadow-xl animate-fade-in">
      {/* Panel Header */}
      <div className="flex items-center justify-between border-b border-white/10 pb-3">
        <div className="flex items-center gap-2">
          <ListChecks className="w-4 h-4 text-electric" />
          <span className="text-white font-bold text-xs uppercase tracking-wider">
            POWER RESTORATION & RECOVERY PLAN — {zoneInfo.title}
          </span>
        </div>
        {isFaulted ? (
          <span className="text-xs text-red-400 font-mono font-bold px-2.5 py-1 rounded-lg bg-red-500/20 border border-red-500/40 shadow animate-pulse">
            EST. RECOVERY: ~{estimatedRestoreMin || 20} MIN
          </span>
        ) : (
          <span className="text-xs text-emerald-400 font-mono font-bold px-2.5 py-1 rounded-lg bg-emerald-500/15 border border-emerald-500/30">
            GRID NOMINAL
          </span>
        )}
      </div>

      {/* Dynamic Sub-Area & Impact Summary Card */}
      <div className={`p-4 rounded-xl border flex flex-col gap-2 transition-all ${
        isFaulted 
          ? 'bg-red-500/10 border-red-500/30 shadow-lg shadow-red-500/5' 
          : 'bg-[#050b14] border-white/10'
      }`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs font-bold text-gray-200">
            <MapPin className={`w-4 h-4 ${isFaulted ? 'text-red-400 animate-pulse' : 'text-emerald-400'}`} />
            <span>{isFaulted ? '🚨 Outage Impacted Sub-Areas & Villages' : '📍 Connected Feeder Sub-Areas & Villages'}</span>
          </div>
          <span className="text-[11px] text-gray-400 font-mono flex items-center gap-1">
            <Users className="w-3.5 h-3.5 text-electric" /> {activeSectionInfo.consumers} Consumers
          </span>
        </div>

        {/* Badges for Sub-Areas / Villages */}
        <div className="flex flex-wrap gap-1.5 mt-1">
          {displayVillages.map(v => (
            <span
              key={v}
              className={`text-[11px] font-mono font-bold px-2.5 py-1 rounded-lg border transition ${
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
        <div className="text-[11px] text-gray-400 flex items-center justify-between border-t border-white/5 pt-2 mt-1">
          <span className="truncate">🏥 Critical Feed: <strong className="text-gray-200">{activeSectionInfo.criticalLoad}</strong></span>
          <span className={`font-mono font-bold px-2 py-0.5 rounded-md text-[10px] ${
            isFaulted ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
          }`}>
            {isFaulted ? 'STATUS: OUTAGE' : 'STATUS: NORMAL'}
          </span>
        </div>
      </div>

      {/* Dynamic Switching Steps Plan */}
      {!isFaulted ? (
        <div className="text-center py-5 text-gray-400 text-xs bg-[#050b14] rounded-xl border border-white/5 p-4 space-y-1">
          <ShieldCheck className="w-6 h-6 text-emerald-400 mx-auto mb-1 opacity-80" />
          <p className="font-bold text-gray-200">Feeder Section #{selectedSectionId} Operating Normally</p>
          <p className="text-[11px] text-gray-500">
            Grid voltage and current telemetry are nominal. In the event of a fault, automated SCADA isolator switching protocols will execute here.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {allCompleted && (
            <div className="p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 flex items-center justify-between text-xs font-semibold animate-pulse">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-emerald-400" />
                <span>✓ All isolator switching steps complete! Section ready for energization.</span>
              </div>
              <button
                onClick={() => setCompletedSteps({})}
                className="px-2.5 py-1 rounded-lg bg-emerald-400 text-[#070d18] font-bold hover:bg-emerald-300 transition cursor-pointer"
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
                className={`p-3 rounded-xl border transition-all duration-200 cursor-pointer select-none ${
                  isDone
                    ? 'border-emerald-500/40 bg-emerald-500/10'
                    : isCurrent
                    ? 'border-amber-500/60 bg-amber-500/10 shadow-lg shadow-amber-500/10 scale-[1.01]'
                    : 'border-white/5 bg-[#050b14] opacity-70 hover:opacity-100'
                }`}
              >
                <div className="flex items-start gap-2.5">
                  <div className="flex-shrink-0 mt-0.5">
                    {isDone ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    ) : isCurrent ? (
                      <Loader2 className="w-4 h-4 text-amber-400 animate-spin" />
                    ) : (
                      <Circle className="w-4 h-4 text-gray-500" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono text-gray-400 font-bold">STEP {step.step_number}</span>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-electric/15 text-electric border border-electric/30 font-bold">
                          {step.switch_id}
                        </span>
                      </div>
                      <span className="text-[10px] text-gray-400 font-mono">
                        {isDone ? 'COMPLETED' : isCurrent ? 'ACTION REQUIRED' : 'PENDING'}
                      </span>
                    </div>
                    <p className={`text-xs mt-1 font-semibold ${isDone ? 'text-emerald-300 line-through opacity-80' : isCurrent ? 'text-white' : 'text-gray-300'}`}>
                      {step.action}
                    </p>
                    <p className="text-[10px] text-gray-400 mt-0.5 leading-tight">{step.safety_check}</p>
                    {step.restores.length > 0 && (
                      <p className="text-[10px] text-emerald-400 font-medium mt-1">
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
