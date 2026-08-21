import { useGridStore } from '../../store/gridStore'
import { statusToColor, pct } from '../../lib/utils'
import { FAULT_TYPES } from '../../lib/constants'
import type { FaultTypeKey } from '../../types'

export function SectionGrid() {
  const { sections, activeAlert, selectedSectionId, setSelectedSectionId } = useGridStore()

  return (
    <div className="grid grid-cols-5 gap-3">
      {sections.map(sec => {
        const isCritical = sec.status === 'critical'
        const isSelected = sec.id === selectedSectionId
        const color = statusToColor(sec.status)

        return (
          <div
            key={sec.id}
            onClick={() => setSelectedSectionId(sec.id)}
            className={`section-card cursor-pointer transition-all duration-200 select-none ${sec.status} ${
              isCritical ? 'shadow-glow-red' : ''
            } ${isSelected ? 'ring-2 ring-electric/80 scale-[1.02] bg-navy-700/80' : 'hover:scale-[1.01] hover:bg-navy-700/50'}`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-400 font-mono">SEC {sec.id}</span>
              <span
                className={`status-badge ${sec.status}`}
                style={{ color, borderColor: `${color}33`, background: `${color}15` }}
              >
                <span className={`h-1.5 w-1.5 rounded-full ${isCritical ? 'animate-pulse-fast' : ''}`}
                  style={{ background: color }} />
                {sec.status.toUpperCase()}
              </span>
            </div>

            <div>
              <p className="font-mono text-2xl font-bold" style={{ color }}>
                {pct(sec.fault_probability)}
              </p>
              <p className="text-[10px] text-gray-500">fault probability</p>
            </div>

            {isCritical && activeAlert?.section_id === sec.id && (
              <p className="text-[10px] text-fault-critical font-mono truncate">
                {FAULT_TYPES[activeAlert.fault_type as FaultTypeKey] ?? activeAlert.fault_type}
              </p>
            )}

            {/* Mini bar */}
            <div className="h-1 rounded-full bg-navy-500 overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{ width: pct(sec.fault_probability), background: color }}
              />
            </div>
          </div>
        )
      })}

      {sections.length === 0 && Array.from({ length: 5 }, (_, i) => (
        <div key={i} className="section-card normal animate-pulse">
          <div className="h-4 bg-navy-600 rounded w-16" />
          <div className="h-8 bg-navy-600 rounded w-20 mt-2" />
        </div>
      ))}
    </div>
  )
}
