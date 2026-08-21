import { Bell, AlertCircle, ArrowRight } from 'lucide-react'
import { useGridStore } from '../../store/gridStore'
import { formatDate, faultTypeLabel } from '../../lib/utils'

export function AlertPanel() {
  const { alerts, setSelectedSectionId } = useGridStore()

  return (
    <div className="card flex flex-col gap-4">
      {/* Header */}
      <div className="card-header mb-0 justify-between">
        <div className="flex items-center gap-2">
          <Bell className="w-4 h-4 text-electric" />
          Fault Alerts
        </div>
        {alerts.length > 0 && (
          <span className="px-2.5 py-1 rounded-full bg-red-500/20 text-red-400 text-xs font-bold border border-red-500/35 animate-pulse">
            {alerts.length} ACTIVE
          </span>
        )}
      </div>

      {/* List */}
      <div className="space-y-2.5 overflow-y-auto pr-1" style={{ maxHeight: 220 }}>
        {alerts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-gray-400 gap-2">
            <AlertCircle className="w-7 h-7 text-gray-500" />
            <p className="text-sm font-medium">No fault alerts</p>
            <p className="text-xs text-gray-500">Grid is operating normally</p>
          </div>
        ) : (
          alerts.map((alert, idx) => (
            <button
              key={`${alert.section_id}-${alert.triggered_at}-${idx}`}
              onClick={() => setSelectedSectionId(alert.section_id)}
              className={`w-full text-left p-3 rounded-xl border transition-all duration-200 hover:scale-[1.01] active:scale-[0.99] ${
                idx === 0
                  ? 'border-red-500/40 bg-red-500/10'
                  : 'border-white/10 bg-white/3 hover:bg-white/6'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span className={`h-2.5 w-2.5 rounded-full flex-shrink-0 ${
                    idx === 0 ? 'bg-red-400 animate-pulse' : 'bg-amber-400'
                  }`} />
                  <span className="text-sm font-bold text-electric font-mono">SEC {alert.section_id}</span>
                  <span className="text-sm font-semibold text-white truncate">
                    {faultTypeLabel(alert.fault_type)}
                  </span>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className={`text-sm font-mono font-bold ${idx === 0 ? 'text-red-400' : 'text-amber-400'}`}>
                    {(alert.confidence * 100).toFixed(0)}%
                  </span>
                  <ArrowRight className="w-3.5 h-3.5 text-gray-500" />
                </div>
              </div>
              <p className="text-[11px] text-gray-400 mt-1 font-mono pl-4.5">
                {formatDate(alert.triggered_at)}
              </p>
            </button>
          ))
        )}
      </div>

      {alerts.length > 0 && (
        <p className="text-[10px] text-gray-500 text-center">
          👆 Tap any alert row to inspect that section
        </p>
      )}
    </div>
  )
}
