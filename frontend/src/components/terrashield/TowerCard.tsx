import { useState } from 'react'
import type { TowerReading } from '../../types'
import { statusToColor } from '../../lib/utils'
import { api } from '../../lib/api'
import { useGridStore } from '../../store/gridStore'

interface Props {
  tower: TowerReading
}

export function TowerCard({ tower }: Props) {
  const { _setTowers } = useGridStore()
  const [loading, setLoading] = useState(false)

  const color  = statusToColor(tower.status)
  const isCrit = tower.status === 'critical'
  const isWarn = tower.status === 'warning'

  const toggleSpike = async () => {
    setLoading(true)
    try {
      const newTfr = tower.tfr_ohm > 15 ? 5.2 : 26.8
      await api.mockTowerTFR(tower.id, newTfr)
      const res = await api.getTerraShield()
      _setTowers(res.towers)
    } catch (e) {
      console.error('Failed to mock TFR', e)
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={toggleSpike}
      disabled={loading}
      title="Click to simulate grounding degradation (TFR Spike)"
      className={`flex flex-col items-center gap-1.5 p-2 rounded-lg border transition-all duration-300 hover:border-electric/50 active:scale-95 cursor-pointer
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
          <p className="text-[8px] text-fault-warning font-mono">ERT ANOMALY</p>
        )}
      </div>
    </button>
  )
}
