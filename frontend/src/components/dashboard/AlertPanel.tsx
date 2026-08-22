import { Bell, AlertCircle, ArrowRight, MapPin, Navigation } from 'lucide-react'
import { useGridStore } from '../../store/gridStore'
import { formatDate, faultTypeLabel } from '../../lib/utils'
import { SECTION_NAMES } from '../../lib/constants'

export function AlertPanel() {
  const { alerts, setSelectedSectionId } = useGridStore()

  return (
    <div className="card flex flex-col gap-4 bg-[#0d1626] border border-electric/20 rounded-2xl p-5 shadow-xl">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/10 pb-3">
        <div className="flex items-center gap-2 text-xs font-bold text-white uppercase tracking-wider">
          <Bell className="w-4 h-4 text-electric" />
          <span>Grid Emergency Fault Alerts & Pinpoint Markers</span>
        </div>
        {alerts.length > 0 && (
          <span className="px-2.5 py-1 rounded-full bg-red-500/20 text-red-400 text-xs font-bold border border-red-500/35 animate-pulse">
            {alerts.length} ACTIVE INCIDENTS
          </span>
        )}
      </div>

      {/* List */}
      <div className="space-y-2.5 overflow-y-auto pr-1" style={{ maxHeight: 240 }}>
        {alerts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-gray-400 gap-2">
            <AlertCircle className="w-7 h-7 text-gray-500" />
            <p className="text-sm font-bold text-gray-300">No active grid emergencies</p>
            <p className="text-xs text-gray-500">All 5 feeder line sections are operating within nominal limits</p>
          </div>
        ) : (
          alerts.map((alert, idx) => {
            const sectionInfo = SECTION_NAMES[alert.section_id]

            return (
              <button
                key={`${alert.section_id}-${alert.triggered_at}-${idx}`}
                onClick={() => setSelectedSectionId(alert.section_id)}
                className={`w-full text-left p-3.5 rounded-xl border transition-all duration-200 hover:scale-[1.01] active:scale-[0.99] cursor-pointer ${
                  idx === 0
                    ? 'border-red-500/50 bg-red-500/10 shadow-lg shadow-red-500/10'
                    : 'border-white/10 bg-[#050b14] hover:bg-white/5'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className={`h-2.5 w-2.5 rounded-full flex-shrink-0 ${
                      idx === 0 ? 'bg-red-400 animate-pulse' : 'bg-amber-400'
                    }`} />
                    <span className="text-xs font-bold text-electric">Section #{alert.section_id}</span>
                    <span className="text-xs font-bold text-white truncate">
                      {faultTypeLabel(alert.fault_type)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className={`text-xs font-mono font-bold ${idx === 0 ? 'text-red-400' : 'text-amber-400'}`}>
                      {(alert.confidence * 100).toFixed(0)}% Risk
                    </span>
                    <ArrowRight className="w-3.5 h-3.5 text-gray-500" />
                  </div>
                </div>

                {/* GPS Coordinates & Pinpointed Tower Metadata */}
                {sectionInfo && (
                  <div className="mt-2.5 pt-2 border-t border-white/5 flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono">
                    <div className="flex items-center gap-1.5 text-amber-300 font-bold">
                      <MapPin className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                      <span>{sectionInfo.tower}</span>
                      <span className="text-gray-400 font-normal">({sectionInfo.dist_km} km from substation)</span>
                    </div>

                    <div className="flex items-center gap-1 text-electric font-bold">
                      <Navigation className="w-3 h-3 text-electric" />
                      <span>{sectionInfo.lat}° N, {sectionInfo.lon}° E</span>
                    </div>
                  </div>
                )}

                <p className="text-[10px] text-gray-400 mt-1 font-mono">
                  Triggered: {formatDate(alert.triggered_at)}
                </p>
              </button>
            )
          })
        )}
      </div>

      {alerts.length > 0 && (
        <p className="text-[10px] text-gray-400 text-center font-mono">
          👆 Click any alert row to jump to pinpointed GPS coordinates on the GIS map
        </p>
      )}
    </div>
  )
}
