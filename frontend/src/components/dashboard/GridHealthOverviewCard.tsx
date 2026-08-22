import { useNavigate } from 'react-router-dom'
import { Activity, ShieldAlert, Cpu, Zap, ArrowRight, CheckCircle2 } from 'lucide-react'
import { useGridStore } from '../../store/gridStore'

export function GridHealthOverviewCard() {
  const navigate = useNavigate()
  const { activeAlert, selectedSectionId } = useGridStore()

  const isHealthy = !activeAlert

  return (
    <div className="card flex flex-col gap-4 bg-[#0d1626] border border-electric/20 rounded-2xl p-5 shadow-xl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs font-bold text-white uppercase tracking-wider">
          <Activity className="w-4 h-4 text-electric" />
          <span>Real-Time Feeder Health & Interlocks</span>
        </div>
        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase ${
          isHealthy
            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
            : 'bg-red-500/20 text-red-400 border border-red-500/40'
        }`}>
          {isHealthy ? 'Grid Nominal' : 'Fault Active'}
        </span>
      </div>

      {/* Grid Telemetry Stats Grid */}
      <div className="grid grid-cols-3 gap-2.5 text-xs">
        <div className="p-3 rounded-xl bg-[#050b14] border border-white/5 space-y-0.5">
          <span className="text-[10px] text-gray-400 font-bold uppercase flex items-center gap-1">
            <Zap className="w-3 h-3 text-amber-400" /> System Freq
          </span>
          <p className="text-base font-black text-white font-mono">50.02 <span className="text-[10px] text-gray-400">Hz</span></p>
        </div>

        <div className="p-3 rounded-xl bg-[#050b14] border border-white/5 space-y-0.5">
          <span className="text-[10px] text-gray-400 font-bold uppercase flex items-center gap-1">
            <Activity className="w-3 h-3 text-electric" /> Phase Voltage
          </span>
          <p className="text-base font-black text-electric font-mono">11.2 <span className="text-[10px] text-gray-400">kV</span></p>
        </div>

        <div className="p-3 rounded-xl bg-[#050b14] border border-white/5 space-y-0.5">
          <span className="text-[10px] text-gray-400 font-bold uppercase flex items-center gap-1">
            <Cpu className="w-3 h-3 text-purple-400" /> Selected SEC
          </span>
          <p className="text-base font-black text-purple-300 font-mono">Section #{selectedSectionId}</p>
        </div>
      </div>

      {/* Grounding & Hardware Sentinel Banner */}
      <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between text-xs">
        <div className="flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
          <div>
            <p className="text-white font-bold">Tower Grounding Telemetry Active</p>
            <p className="text-[11px] text-gray-400">ERT sensors reporting average TFR of 4.12 Ω (Normal)</p>
          </div>
        </div>
      </div>

      {/* Button to open TerraShield AI Diagnostics */}
      <button
        onClick={() => navigate('/terrashield')}
        className="w-full py-2.5 bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/40 text-emerald-300 hover:text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 transition cursor-pointer"
      >
        <ShieldAlert className="w-4 h-4 text-emerald-400" />
        <span>Open TerraShield™ AI Diagnostics Studio</span>
        <ArrowRight className="w-4 h-4" />
      </button>
    </div>
  )
}
