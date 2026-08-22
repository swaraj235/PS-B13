import { useWebSocket } from '../hooks/useWebSocket'
import { useFaultData }  from '../hooks/useFaultData'
import { useTerraShield } from '../hooks/useTerraShield'
import { Header }          from '../components/layout/Header'
import { SectionGrid }     from '../components/dashboard/SectionGrid'
import { FeederMap }       from '../components/map/FeederMap'
import { AlertPanel }      from '../components/dashboard/AlertPanel'
import { SensorTimeSeries } from '../components/dashboard/SensorTimeSeries'
import { SwitchingGuide }  from '../components/restoration/SwitchingGuide'
import { ComplaintsSummaryCard } from '../components/complaints/ComplaintsSummaryCard'
import { GridHealthOverviewCard } from '../components/dashboard/GridHealthOverviewCard'
import { useGridStore }    from '../store/gridStore'

export default function Dashboard() {
  useWebSocket()
  useFaultData()
  useTerraShield()

  const { selectedSectionId } = useGridStore()

  return (
    <div className="flex flex-col h-full overflow-y-auto bg-[#080d1a]">
      <Header title="Operator Dashboard" />

      <div className="flex-1 p-5 space-y-5">

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

          {/* Right Column (6 cols): Grid Overview -> Restoration Plan -> Consumer Complaints Summary */}
          <div className="lg:col-span-6 flex flex-col gap-5">
            <GridHealthOverviewCard />
            <SwitchingGuide />
            <ComplaintsSummaryCard />
          </div>

        </section>

      </div>
    </div>
  )
}
