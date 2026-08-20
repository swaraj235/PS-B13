import { CheckCircle2, Loader2, Circle, ListChecks, MapPin } from 'lucide-react'
import { useGridStore } from '../../store/gridStore'

export function SwitchingGuide() {
  const { switchSteps, affectedVillages, estimatedRestoreMin, activeAlert } = useGridStore()

  if (switchSteps.length === 0) {
    return (
      <div className="card">
        <div className="card-header">
          <ListChecks className="w-4 h-4 text-electric" />
          Restoration Guide
        </div>
        <div className="text-center py-6 text-gray-500 text-sm">
          No active restoration plan
        </div>
      </div>
    )
  }

  return (
    <div className="card flex flex-col gap-3 animate-fade-in">
      <div className="card-header">
        <ListChecks className="w-4 h-4 text-electric" />
        Restoration Plan
        <span className="ml-auto text-xs text-gray-400 font-mono">
          ~{estimatedRestoreMin} min
        </span>
      </div>

      <div className="space-y-2">
        {switchSteps.map((step, idx) => {
          const isDone       = idx === 0
          const isInProgress = idx === 1
          const isPending    = idx >= 2

          return (
            <div
              key={step.step_number}
              className={`p-3 rounded-lg border transition-all duration-300 ${
                isDone       ? 'border-fault-normal/30  bg-fault-normal/5'  :
                isInProgress ? 'border-fault-warning/40 bg-fault-warning/5 shadow-glow-amber' :
                               'border-white/5 bg-navy-800/40 opacity-60'
              }`}
            >
              <div className="flex items-start gap-2">
                <div className="flex-shrink-0 mt-0.5">
                  {isDone       && <CheckCircle2 className="w-4 h-4 text-fault-normal" />}
                  {isInProgress && <Loader2 className="w-4 h-4 text-fault-warning animate-spin" />}
                  {isPending    && <Circle className="w-4 h-4 text-gray-600" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono text-gray-500">STEP {step.step_number}</span>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-navy-600 text-electric border border-electric/20">
                      {step.switch_id}
                    </span>
                  </div>
                  <p className={`text-xs mt-0.5 font-medium ${isDone ? 'text-fault-normal' : isInProgress ? 'text-fault-warning' : 'text-gray-400'}`}>
                    {step.action}
                  </p>
                  <p className="text-[10px] text-gray-500 mt-0.5 leading-tight">{step.safety_check}</p>
                  {step.restores.length > 0 && (
                    <p className="text-[10px] text-fault-normal mt-1">
                      ✓ Restores: {step.restores.join(', ')}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {affectedVillages.length > 0 && (
        <div className="border-t border-white/5 pt-3">
          <p className="text-[10px] text-gray-500 mb-2 flex items-center gap-1">
            <MapPin className="w-3 h-3" /> Affected Villages
          </p>
          <div className="flex flex-wrap gap-1.5">
            {affectedVillages.map(v => (
              <span key={v} className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-fault-critical/10 text-fault-critical border border-fault-critical/20">
                {v}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
