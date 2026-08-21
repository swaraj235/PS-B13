import type { TowerReading } from '../../types'
import { statusToColor } from '../../lib/utils'

interface Props {
  tower: TowerReading
}

export function TowerCard({ tower }: Props) {
  const color     = statusToColor(tower.status)
  const isCrit    = tower.status === 'critical'
  const isWarn    = tower.status === 'warning'

  return (
    <div className={`flex flex-col items-center gap-1.5 p-2 rounded-lg border transition-all duration-300
      ${isCrit ? 'border-fault-critical/40 bg-fault-critical/5 shadow-glow-red' :
        isWarn  ? 'border-fault-warning/30 bg-fault-warning/5' :
                  'border-white/5 bg-navy-800/50'}`}
    >
      {/* Status ring */}
      <div
        className={`w-8 h-8 rounded-full border-2 flex items-center justify-center text-[10px] font-bold font-mono
          ${isCrit ? 'animate-pulse-fast' : ''}`}
        style={{ borderColor: color, color, background: `${color}15` }}
      >
        {tower.id}
      </div>

      {/* TFR */}
      <div className="text-center">
        <p className="font-mono text-xs font-bold" style={{ color }}>
          {tower.tfr_ohm.toFixed(1)} Ω
        </p>
        {tower.ert_anomaly && (
          <p className="text-[8px] text-fault-warning font-mono">ERT!</p>
        )}
      </div>
    </div>
  )
}
