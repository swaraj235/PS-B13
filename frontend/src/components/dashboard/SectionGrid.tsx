import { useGridStore } from '../../store/gridStore'
import { statusToColor, pct } from '../../lib/utils'
import { FAULT_TYPES } from '../../lib/constants'
import type { FaultTypeKey } from '../../types'

const STATUS_LABELS: Record<string, string> = {
  normal: 'All Clear',
  warning: 'Alert',
  critical: 'FAULT',
}

export function SectionGrid() {
  const { sections, activeAlert, selectedSectionId, setSelectedSectionId } = useGridStore()

  return (
    <div>
      <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mb-3 flex items-center gap-2">
        <span className="inline-block w-1 h-4 rounded bg-electric"></span>
        Feeder Section Status — Click any section to inspect
      </p>
      <div className="grid grid-cols-5 gap-3">
        {sections.map(sec => {
          const isCritical = sec.status === 'critical'
          const isSelected = sec.id === selectedSectionId
          const color = statusToColor(sec.status)

          return (
            <div
              key={sec.id}
              onClick={() => setSelectedSectionId(sec.id)}
              className={`section-card ${sec.status} ${isSelected ? 'selected ring-2 ring-electric/60' : ''}`}
              title={`Click to inspect Section ${sec.id}`}
            >
              {/* Header row */}
              <div className="flex items-center justify-between gap-1">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-gray-300 tracking-wider">SEC {sec.id}</span>
                  {isSelected && (
                    <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-electric/20 text-electric border border-electric/30 font-bold">
                      ACTIVE
                    </span>
                  )}
                </div>
                <span
                  className={`status-badge ${sec.status} text-[10px] px-2 py-0.5`}
                >
                  <span className={`h-1.5 w-1.5 rounded-full flex-shrink-0 ${isCritical ? 'animate-pulse' : ''}`}
                    style={{ background: color }} />
                  {STATUS_LABELS[sec.status]}
                </span>
              </div>

              {/* Probability */}
              <div>
                <p className="font-mono font-bold leading-none" style={{ color, fontSize: '1.6rem' }}>
                  {pct(sec.fault_probability)}
                </p>
                <p className="text-[11px] text-gray-400 mt-0.5">Fault Probability</p>
              </div>

              {/* Fault label if critical */}
              {isCritical && activeAlert?.section_id === sec.id && (
                <p className="text-[10px] text-red-400 font-bold font-mono truncate">
                  ↳ {FAULT_TYPES[activeAlert.fault_type as FaultTypeKey] ?? activeAlert.fault_type}
                </p>
              )}

              {/* Progress bar */}
              <div className="h-1.5 rounded-full bg-white/8 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{ width: pct(sec.fault_probability), background: color }}
                />
              </div>
            </div>
          )
        })}

        {/* Skeleton placeholders while loading */}
        {sections.length === 0 && Array.from({ length: 5 }, (_, i) => (
          <div key={i} className="section-card normal animate-pulse">
            <div className="h-3 bg-navy-600 rounded w-16" />
            <div className="h-8 bg-navy-600 rounded w-20 mt-2" />
            <div className="h-1.5 bg-navy-600 rounded mt-2" />
          </div>
        ))}
      </div>
    </div>
  )
}
