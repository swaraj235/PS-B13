import { Brain, TrendingUp, TrendingDown } from 'lucide-react'
import { useGridStore } from '../../store/gridStore'
import { faultTypeLabel } from '../../lib/utils'

export function SHAPChart() {
  const { explanation } = useGridStore()

  if (!explanation) {
    return (
      <div className="card">
        <div className="card-header">
          <Brain className="w-4 h-4 text-electric" />
          AI Explanation
        </div>
        <div className="text-center py-6 text-gray-500 text-sm">
          Click an alert to load SHAP analysis
        </div>
      </div>
    )
  }

  const maxContrib = Math.max(...explanation.top_reasons.map(r => r.contribution))

  return (
    <div className="card flex flex-col gap-3 animate-fade-in">
      <div className="card-header">
        <Brain className="w-4 h-4 text-electric" />
        AI Analysis — Sec {explanation.section_id}
        <span className="ml-auto px-2 py-0.5 rounded-full bg-fault-critical/15 text-fault-critical text-[10px] font-mono border border-fault-critical/20">
          {faultTypeLabel(explanation.fault_type).toUpperCase()}
        </span>
      </div>

      <div className="space-y-3">
        {explanation.top_reasons.map((reason) => {
          const isRisk = reason.direction === 'increase_risk'
          const color  = isRisk ? '#EF4444' : '#00D4FF'
          const barPct = (reason.contribution / maxContrib) * 100

          return (
            <div key={reason.feature_key} className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-300 flex items-center gap-1">
                  {isRisk
                    ? <TrendingUp className="w-3 h-3 text-fault-critical" />
                    : <TrendingDown className="w-3 h-3 text-electric" />
                  }
                  {reason.feature}
                </span>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-gray-400">
                    {reason.value.toFixed(1)}
                  </span>
                  <span className="font-mono font-bold" style={{ color }}>
                    {isRisk ? '+' : '-'}{(reason.contribution * 100).toFixed(0)}%
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {!isRisk && <div className="flex-1 h-2 bg-navy-500 rounded-full" />}
                <div className="flex-1 h-2 bg-navy-500 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{ width: `${barPct}%`, background: color, boxShadow: `0 0 8px ${color}40` }}
                  />
                </div>
                {isRisk && <div className="flex-1 h-2 bg-navy-500 rounded-full" />}
              </div>
            </div>
          )
        })}
      </div>

      <p className="text-xs text-gray-400 italic border-t border-white/5 pt-3 leading-relaxed">
        {explanation.summary}
      </p>
    </div>
  )
}
