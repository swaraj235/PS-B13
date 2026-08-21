import { useState } from 'react'
import { CheckCircle2, Loader2, Circle, ListChecks, MapPin, RefreshCw, Zap } from 'lucide-react'
import { useGridStore } from '../../store/gridStore'

export function SwitchingGuide() {
  const { switchSteps, affectedVillages, estimatedRestoreMin, selectedSectionId } = useGridStore()
  const [completedSteps, setCompletedSteps] = useState<Record<number, boolean>>({})

  const toggleStep = (stepNum: number) => {
    setCompletedSteps(prev => ({
      ...prev,
      [stepNum]: !prev[stepNum]
    }))
  }

  const allCompleted = switchSteps.length > 0 && switchSteps.every(s => completedSteps[s.step_number])

  if (switchSteps.length === 0) {
    return (
      <div className="card">
        <div className="card-header justify-between">
          <div className="flex items-center gap-2">
            <ListChecks className="w-4 h-4 text-electric" />
            <span className="text-white font-semibold">Restoration Guide</span>
          </div>
        </div>
        <div className="text-center py-6 text-gray-400 text-xs">
          No active restoration protocol for Section {selectedSectionId} (Status: Normal)
        </div>
      </div>
    )
  }

  return (
    <div className="card flex flex-col gap-3 animate-fade-in">
      <div className="card-header justify-between">
        <div className="flex items-center gap-2">
          <ListChecks className="w-4 h-4 text-electric" />
          <span className="text-white font-semibold">Restoration Plan — SEC {selectedSectionId}</span>
        </div>
        <span className="text-xs text-electric font-mono font-bold px-2 py-0.5 rounded bg-electric/10 border border-electric/20">
          EST: ~{estimatedRestoreMin} MIN
        </span>
      </div>

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

      <div className="space-y-2">
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

      {affectedVillages.length > 0 && (
        <div className="border-t border-white/10 pt-2.5">
          <p className="text-[10px] text-gray-400 font-semibold mb-1.5 flex items-center gap-1">
            <MapPin className="w-3 h-3 text-electric" /> Affected Sub-Areas / Villages:
          </p>
          <div className="flex flex-wrap gap-1.5">
            {affectedVillages.map(v => (
              <span key={v} className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-fault-critical/15 text-fault-critical border border-fault-critical/30">
                {v}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
