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
  useWebSocket()
  useFaultData()
  useTerraShield()

  const { selectedSectionId } = useGridStore()

  return (
    <div className="flex flex-col h-full overflow-hidden bg-[#080d1a]">
      <Header title="Operator Dashboard" />

      <div className="flex-1 overflow-y-auto p-5 space-y-5">

        {/* ── Top: Feeder Section Status Cards ─────────────────── */}
        <section>
          <SectionGrid />
        </section>

        {/* ── Main Dashboard: Balanced 6:6 Equal-Height Columns ─── */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">

          {/* Left Column (6 cols): Map -> Live Telemetry -> Fault Alerts */}
          <div className="lg:col-span-6 flex flex-col gap-5">
            <FeederMap />
            <SensorTimeSeries sectionId={selectedSectionId} />
            <AlertPanel />
          </div>

          {/* Right Column (6 cols): AI Explanation -> Restoration Plan -> Consumer Complaints */}
          <div className="lg:col-span-6 flex flex-col gap-5">
            <SHAPChart />
            <SwitchingGuide />
            <ComplaintsFeed />
          </div>

        </section>

        {/* ── Bottom: TerraShield Tower Grounding Status ───────── */}
        <section>
          <TerraShieldPanel />
        </section>

      </div>
    </div>
  )
}
