import { Header } from '../components/layout/Header'
import { TerraShieldPanel } from '../components/terrashield/TerraShieldPanel'
import { SHAPChart } from '../components/analysis/SHAPChart'
import { useTerraShield } from '../hooks/useTerraShield'
import { Shield, Cpu, Activity, Zap, CheckCircle2, AlertTriangle, Layers, Radio } from 'lucide-react'

export function TerraShieldView() {
  useTerraShield()

  return (
    <div className="flex flex-col h-full overflow-y-auto bg-[#080d1a] space-y-6">
      <Header title="TerraShield AI Sentinel & Fault Diagnostics" />

      <div className="p-6 space-y-6 max-w-7xl mx-auto w-full">
        {/* Page Sub-Header */}
        <div className="bg-[#0d1626] border border-emerald-500/30 rounded-2xl p-6 shadow-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-emerald-500/15 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
              <Shield className="w-8 h-8" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-black text-white">TerraShield™ GNN AI Sentinel Studio</h1>
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-mono font-bold border border-emerald-500/40">
                  T-GAT v2.4 Active
                </span>
              </div>
              <p className="text-xs text-gray-400 mt-1">
                Real-time Temporal Graph Attention Network (T-GAT) analyzing tower grounding surge currents, soil impedance, and multi-scale electrical telemetry.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 font-mono text-xs">
            <div className="p-3 bg-[#050b14] border border-white/10 rounded-xl space-y-0.5">
              <span className="text-[10px] text-gray-400 uppercase font-bold block">Model F1 Accuracy</span>
              <span className="text-emerald-400 font-bold">98.4% F1-Score</span>
            </div>
            <div className="p-3 bg-[#050b14] border border-white/10 rounded-xl space-y-0.5">
              <span className="text-[10px] text-gray-400 uppercase font-bold block">Inference Latency</span>
              <span className="text-electric font-bold">&lt; 14 ms</span>
            </div>
          </div>
        </div>

        {/* Top Metric Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-[#0d1626] border border-white/10 rounded-2xl p-4 space-y-1 shadow-lg">
            <div className="flex items-center justify-between text-xs text-gray-400 font-bold uppercase">
              <span>Substation Towers Monitored</span>
              <Layers className="w-4 h-4 text-electric" />
            </div>
            <p className="text-2xl font-black text-white font-mono">148 <span className="text-xs font-normal text-gray-400">Towers</span></p>
            <p className="text-[10px] text-emerald-400 font-mono">100% Telemetry Online</p>
          </div>

          <div className="bg-[#0d1626] border border-white/10 rounded-2xl p-4 space-y-1 shadow-lg">
            <div className="flex items-center justify-between text-xs text-gray-400 font-bold uppercase">
              <span>Average Grounding Resistance</span>
              <Activity className="w-4 h-4 text-emerald-400" />
            </div>
            <p className="text-2xl font-black text-emerald-400 font-mono">4.12 <span className="text-xs font-normal text-gray-400">Ω</span></p>
            <p className="text-[10px] text-gray-400">Target &lt; 5.0 Ω (IEEE 80)</p>
          </div>

          <div className="bg-[#0d1626] border border-white/10 rounded-2xl p-4 space-y-1 shadow-lg">
            <div className="flex items-center justify-between text-xs text-gray-400 font-bold uppercase">
              <span>Lightning Surge Counter</span>
              <Zap className="w-4 h-4 text-amber-400" />
            </div>
            <p className="text-2xl font-black text-amber-400 font-mono">18 <span className="text-xs font-normal text-gray-400">Surges / 24h</span></p>
            <p className="text-[10px] text-gray-400">Auto-Diverted to Earth</p>
          </div>

          <div className="bg-[#0d1626] border border-white/10 rounded-2xl p-4 space-y-1 shadow-lg">
            <div className="flex items-center justify-between text-xs text-gray-400 font-bold uppercase">
              <span>GNN Model Health</span>
              <Cpu className="w-4 h-4 text-purple-400 animate-pulse" />
            </div>
            <p className="text-2xl font-black text-purple-300 font-mono">NOMINAL</p>
            <p className="text-[10px] text-gray-400">Continuous Evaluation Active</p>
          </div>
        </div>

        {/* Main Grid: SHAP Explainability & Tower Grounding */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-6 space-y-6">
            <SHAPChart />
          </div>
          <div className="lg:col-span-6 space-y-6">
            <TerraShieldPanel />
          </div>
        </div>
      </div>
    </div>
  )
}
