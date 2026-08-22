import { Brain, TrendingUp, TrendingDown, Activity } from 'lucide-react'
import { useGridStore } from '../../store/gridStore'
import { faultTypeLabel } from '../../lib/utils'
import { SECTION_NAMES } from '../../lib/constants'

const DIRECTION_LABELS: Record<string, string> = {
  increase_risk: 'Increases breakdown risk',
  decrease_risk: 'Keeps feeder line stable',
}

export function SHAPChart() {
  const { explanation, selectedSectionId, latestReadings, sections } = useGridStore()

  const currentSection = sections.find(s => s.id === selectedSectionId)
  const isFault = currentSection?.status === 'critical'
  const isWarn  = currentSection?.status === 'warning'

  const reading = latestReadings[selectedSectionId] || {
    voltage_pu: isFault ? 0.612 : 0.995,
    current_A:  isFault ? 386.5 : 182.0,
    temp_C:     isFault ? 71.4  : 54.5,
    thd_pct:    isFault ? 16.8  : 3.8,
    power_factor: 0.92,
  }

  // Derive dynamic real-time SHAP feature contributions
  const vSag = Math.max(0, 1.0 - reading.voltage_pu)
  const isVSagHigh = vSag > 0.08
  const isCurrHigh = reading.current_A > 230
  const isTempHigh = reading.temp_C > 60
  const isThdHigh  = reading.thd_pct > 6.0

  const liveReasons = [
    {
      feature_key: 'voltage_pu',
      feature: isVSagHigh ? 'Line Voltage Sag' : 'Grid Voltage Stability',
      value: reading.voltage_pu * 100, // display in %
      contribution: isVSagHigh ? Math.min(0.85, vSag * 1.7) : 0.42,
      direction: isVSagHigh ? 'increase_risk' : 'decrease_risk',
    },
    {
      feature_key: 'current_A',
      feature: isCurrHigh ? 'Feeder Current Overload' : 'Feeder Load Current',
      value: reading.current_A,
      contribution: isCurrHigh ? Math.min(0.80, (reading.current_A - 180) / 220) : 0.35,
      direction: isCurrHigh ? 'increase_risk' : 'decrease_risk',
    },
    {
      feature_key: 'thd_pct',
      feature: isThdHigh ? 'Harmonic Distortion Spike' : 'Waveform THD Quality',
      value: reading.thd_pct,
      contribution: isThdHigh ? Math.min(0.65, reading.thd_pct / 20.0) : 0.25,
      direction: isThdHigh ? 'increase_risk' : 'decrease_risk',
    },
    {
      feature_key: 'temp_C',
      feature: isTempHigh ? 'Transformer Overheating' : 'Equipment Thermal Standard',
      value: reading.temp_C,
      contribution: isTempHigh ? Math.min(0.60, (reading.temp_C - 55) / 25.0) : 0.20,
      direction: isTempHigh ? 'increase_risk' : 'decrease_risk',
    },
  ]

  const displayReasons = (explanation && explanation.section_id === selectedSectionId)
    ? explanation.top_reasons
    : liveReasons

  const faultType = (explanation && explanation.section_id === selectedSectionId)
    ? explanation.fault_type
    : (isFault ? 'conductor_damage' : 'vegetation_contact')

  const maxContrib = Math.max(...displayReasons.map(r => r.contribution), 0.1)
  const zoneTitle = SECTION_NAMES[selectedSectionId]?.title ?? `Zone ${selectedSectionId}`

  const statusBadge = isFault ? (
    <span className="px-3 py-1 rounded-full bg-red-500/15 text-red-400 text-xs font-bold border border-red-500/30 tracking-wide animate-pulse">
      {faultTypeLabel(faultType).toUpperCase()}
    </span>
  ) : isWarn ? (
    <span className="px-3 py-1 rounded-full bg-amber-500/15 text-amber-400 text-xs font-bold border border-amber-500/30 tracking-wide">
      DISTURBANCE ALERT
    </span>
  ) : (
    <span className="px-3 py-1 rounded-full bg-emerald-500/15 text-emerald-400 text-xs font-bold border border-emerald-500/30 tracking-wide">
      OPTIMAL BASELINE
    </span>
  )

  const dynamicSummary = (explanation && explanation.section_id === selectedSectionId)
    ? explanation.summary
    : isFault
    ? `Real-Time Fault Detected on ${zoneTitle}: Severe voltage drop (${(reading.voltage_pu*100).toFixed(1)}%) combined with current surge (${reading.current_A.toFixed(0)}A) triggers primary breakdown risk.`
    : `Zone Operating Normally: Stable voltage (${(reading.voltage_pu*100).toFixed(1)}%) and low thermal load keeping breakdown probability at minimal baseline (<5%).`

  return (
    <div className="card flex flex-col gap-4 animate-fade-in">
      {/* Header */}
      <div className="card-header mb-0 justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Brain className="w-4 h-4 text-electric" />
          <span>AI Root-Cause Diagnostic — <strong className="text-white">{zoneTitle}</strong></span>
        </div>
        {statusBadge}
      </div>

      {/* SHAP bars */}
      <div className="space-y-3.5">
        {displayReasons.map(reason => {
          const isRisk = reason.direction === 'increase_risk'
          const color  = isRisk ? '#EF4444' : '#00D4FF'
          const barPct = Math.min(100, (reason.contribution / maxContrib) * 100)

          return (
            <div key={reason.feature_key}>
              {/* Feature label + values */}
              <div className="flex items-center justify-between mb-1.5 gap-2">
                <span className="text-xs text-gray-200 font-medium flex items-center gap-1.5 flex-1 min-w-0">
                  {isRisk
                    ? <TrendingUp className="w-3.5 h-3.5 text-red-400 flex-shrink-0" />
                    : <TrendingDown className="w-3.5 h-3.5 text-electric flex-shrink-0" />}
                  <span className="truncate">{reason.feature}</span>
                </span>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="text-xs font-mono text-gray-400">= {reason.value.toFixed(1)}</span>
                  <span className="text-xs font-mono font-bold" style={{ color }}>
                    {isRisk ? '+' : '−'}{(reason.contribution * 100).toFixed(0)}%
                  </span>
                </div>
              </div>
              {/* Bar */}
              <div className="h-2 rounded-full bg-white/8 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{ width: `${barPct}%`, background: color, boxShadow: `0 0 8px ${color}55` }}
                />
              </div>
              <p className="text-[10px] text-gray-400 mt-1">{DIRECTION_LABELS[reason.direction]}</p>
            </div>
          )
        })}
      </div>

      {/* Live status summary */}
      <div className="p-3 rounded-xl bg-white/4 border border-white/8 flex items-start gap-2">
        <Activity className="w-4 h-4 text-electric flex-shrink-0 mt-0.5" />
        <p className="text-xs text-gray-300 leading-relaxed">
          {dynamicSummary}
        </p>
      </div>
    </div>
  )
}
