import { Brain, TrendingUp, TrendingDown, HelpCircle } from 'lucide-react'
import { useGridStore } from '../../store/gridStore'
import { faultTypeLabel } from '../../lib/utils'

const DIRECTION_LABELS: Record<string, string> = {
  increase_risk: 'Increases fault risk',
  decrease_risk: 'Reduces fault risk',
}

export function SHAPChart() {
  const { explanation } = useGridStore()

  if (!explanation) {
    return (
      <div className="card">
        <div className="card-header mb-0 justify-between">
          <div className="flex items-center gap-2">
            <Brain className="w-4 h-4 text-electric" />
            AI Fault Diagnostics
          </div>
        </div>
        <div className="flex flex-col items-center justify-center py-6 text-gray-400 text-sm gap-2 mt-2">
          <HelpCircle className="w-6 h-6 text-gray-500" />
          <p className="font-medium">No section selected yet</p>
          <p className="text-xs text-gray-500 text-center">
            Click a section card above to see the AI root-cause analysis
          </p>
        </div>
      </div>
    )
  }

  const maxContrib = Math.max(...explanation.top_reasons.map(r => r.contribution))

  return (
    <div className="card flex flex-col gap-4 animate-fade-in">
      {/* Header */}
      <div className="card-header mb-0 justify-between">
        <div className="flex items-center gap-2">
          <Brain className="w-4 h-4 text-electric" />
          AI Analysis — Section {explanation.section_id}
        </div>
        <span className="px-3 py-1 rounded-full bg-red-500/15 text-red-400 text-xs font-bold border border-red-500/30 tracking-wide">
          {faultTypeLabel(explanation.fault_type).toUpperCase()}
        </span>
      </div>

      {/* SHAP bars */}
      <div className="space-y-3.5">
        {explanation.top_reasons.map(reason => {
          const isRisk = reason.direction === 'increase_risk'
          const color  = isRisk ? '#EF4444' : '#00D4FF'
          const barPct = (reason.contribution / maxContrib) * 100

          return (
            <div key={reason.feature_key}>
              {/* Feature label + values */}
              <div className="flex items-center justify-between mb-1.5 gap-2">
                <span className="text-sm text-gray-200 font-medium flex items-center gap-1.5 flex-1 min-w-0">
                  {isRisk
                    ? <TrendingUp className="w-3.5 h-3.5 text-red-400 flex-shrink-0" />
                    : <TrendingDown className="w-3.5 h-3.5 text-electric flex-shrink-0" />}
                  <span className="truncate">{reason.feature}</span>
                </span>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="text-xs font-mono text-gray-400">= {reason.value.toFixed(1)}</span>
                  <span className="text-xs font-mono font-bold" style={{ color }}>
                    {isRisk ? '+' : '−'}{(reason.contribution * 100).toFixed(0)}%
                  </span>
                </div>
              </div>
              {/* Bar */}
              <div className="h-2 rounded-full bg-white/8 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{ width: `${barPct}%`, background: color, boxShadow: `0 0 8px ${color}55` }}
                />
              </div>
              <p className="text-[10px] text-gray-400 mt-1">{DIRECTION_LABELS[reason.direction]}</p>
            </div>
          )
        })}
      </div>

      {/* Summary */}
      <div className="p-3 rounded-xl bg-white/4 border border-white/8">
        <p className="text-xs text-gray-300 leading-relaxed italic">
          💡 {explanation.summary}
        </p>
      </div>
    </div>
  )
}
