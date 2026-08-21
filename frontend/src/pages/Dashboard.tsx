import { useWebSocket } from '../hooks/useWebSocket'
import { useFaultData }  from '../hooks/useFaultData'
import { useTerraShield } from '../hooks/useTerraShield'
import { Header }          from '../components/layout/Header'
import { SectionGrid }     from '../components/dashboard/SectionGrid'
import { FeederMap }       from '../components/map/FeederMap'
import { AlertPanel }      from '../components/dashboard/AlertPanel'
import { SensorTimeSeries } from '../components/dashboard/SensorTimeSeries'
import { SHAPChart }       from '../components/analysis/SHAPChart'
import { SwitchingGuide }  from '../components/restoration/SwitchingGuide'
import { TerraShieldPanel } from '../components/terrashield/TerraShieldPanel'
import { ComplaintsFeed }  from '../components/complaints/ComplaintsFeed'
import { useGridStore }    from '../store/gridStore'

export default function Dashboard() {
  // Mount all live data hooks here
  useWebSocket()
  useFaultData()
  useTerraShield()

  const { selectedSectionId } = useGridStore()

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Header title="Operator Dashboard" />

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Section Status Strip */}
        <SectionGrid />

        {/* Main Content */}
        <div className="grid grid-cols-5 gap-4">
          {/* Left — Map + Alerts */}
          <div className="col-span-3 space-y-4">
            <FeederMap />
            <div className="grid grid-cols-2 gap-4">
              <AlertPanel />
              <ComplaintsFeed />
            </div>
          </div>

          {/* Right — Live Data + AI + Restoration */}
          <div className="col-span-2 space-y-4">
            <SensorTimeSeries sectionId={selectedSectionId} />
            <SHAPChart />
            <SwitchingGuide />
          </div>
        </div>

        {/* TerraShield Panel */}
        <TerraShieldPanel />
      </div>
    </div>
  )
}
