import { Shield } from 'lucide-react'
import { useGridStore } from '../../store/gridStore'
import { TowerCard } from './TowerCard'

export function TerraShieldPanel() {
  const { towers } = useGridStore()

  const critical = towers.filter(t => t.status === 'critical').length
  const warning  = towers.filter(t => t.status === 'warning').length

  return (
    <div className="card flex flex-col gap-3">
      <div className="card-header">
        <Shield className="w-4 h-4 text-electric" />
        TerraShield — Tower Status
        <div className="ml-auto flex items-center gap-2 text-[10px] font-mono">
          {critical > 0 && <span className="text-fault-critical">{critical} CRIT</span>}
          {warning  > 0 && <span className="text-fault-warning">{warning} WARN</span>}
        </div>
      </div>

      <div className="grid grid-cols-5 gap-2">
        {towers.map(tower => (
          <TowerCard key={tower.id} tower={tower} />
        ))}
      </div>

      {towers.length === 0 && (
        <div className="text-center py-4 text-gray-500 text-sm">
          Loading tower data…
        </div>
      )}
    </div>
  )
}
