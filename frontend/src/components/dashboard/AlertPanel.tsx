import { Bell, AlertCircle } from 'lucide-react'
import { useGridStore } from '../../store/gridStore'
import { formatDate, faultTypeLabel } from '../../lib/utils'

export function AlertPanel() {
  const { alerts, loadExplanation, loadSwitchingGuide } = useGridStore()

  return (
    <div className="card flex flex-col gap-3">
      <div className="card-header">
        <Bell className="w-4 h-4 text-electric" />
        Fault Alerts
        {alerts.length > 0 && (
          <span className="ml-auto px-2 py-0.5 rounded-full bg-fault-critical/20 text-fault-critical text-xs font-mono border border-fault-critical/30 animate-pulse">
            {alerts.length}
          </span>
        )}
      </div>

      <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
        {alerts.length === 0 ? (
          <div className="text-center py-6 text-gray-500 text-sm">
            <AlertCircle className="w-6 h-6 mx-auto mb-2 opacity-50" />
            No active alerts
          </div>
        ) : (
          alerts.map((alert, idx) => (
            <button
              key={`${alert.section_id}-${alert.triggered_at}-${idx}`}
              onClick={() => {
                loadExplanation(alert.section_id)
                loadSwitchingGuide(alert.section_id)
              }}
              className={`w-full text-left p-3 rounded-lg border transition-all duration-200 hover:bg-white/5 animate-slide-in
                ${idx === 0
                  ? 'border-fault-critical/40 bg-fault-critical/5 shadow-glow-red'
                  : 'border-white/5 bg-navy-800/50'
                }`}
            >
              <div className="flex items-center gap-2">
                <span className={`h-2 w-2 rounded-full flex-shrink-0 ${idx === 0 ? 'animate-pulse-fast bg-fault-critical' : 'bg-fault-warning'}`} />
                <span className="text-xs font-mono text-gray-400">SEC {alert.section_id}</span>
                <span className="text-xs font-semibold text-white truncate flex-1">
                  {faultTypeLabel(alert.fault_type)}
                </span>
                <span className={`text-xs font-mono font-bold ${idx === 0 ? 'text-fault-critical' : 'text-fault-warning'}`}>
                  {(alert.confidence * 100).toFixed(1)}%
                </span>
              </div>
              <p className="text-[10px] text-gray-500 mt-1 ml-4 font-mono">
                {formatDate(alert.triggered_at)}
              </p>
            </button>
          ))
        )}
      </div>
    </div>
  )
}
