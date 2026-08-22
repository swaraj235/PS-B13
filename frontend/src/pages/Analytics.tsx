import { useState } from 'react'
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts'
import { Header } from '../components/layout/Header'
import { TrendingUp, TrendingDown, Activity, Clock, ShieldCheck, Download, FileText, Zap, Filter } from 'lucide-react'
import { generatePdfReport } from '../lib/exportPdf'

const FAULT_COLORS: Record<string, string> = {
  'Vegetation Contact':   '#22C55E',
  'Conductor Damage':     '#00D4FF',
  'Transformer Overload': '#F59E0B',
  'Illegal Tap':          '#A855F7',
  'Grounding Fault':      '#EF4444',
}

const faultBySection = [
  { section: 'Zone 1 (Kothrud)',  'Vegetation Contact': 4, 'Conductor Damage': 2, 'Transformer Overload': 1, 'Illegal Tap': 0, 'Grounding Fault': 1 },
  { section: 'Zone 2 (Paud Rd)',  'Vegetation Contact': 2, 'Conductor Damage': 5, 'Transformer Overload': 2, 'Illegal Tap': 0, 'Grounding Fault': 0 },
  { section: 'Zone 3 (Kondhwa)',  'Vegetation Contact': 8, 'Conductor Damage': 3, 'Transformer Overload': 4, 'Illegal Tap': 2, 'Grounding Fault': 1 },
  { section: 'Zone 4 (Hadapsar)', 'Vegetation Contact': 3, 'Conductor Damage': 1, 'Transformer Overload': 3, 'Illegal Tap': 1, 'Grounding Fault': 2 },
  { section: 'Zone 5 (Swargate)', 'Vegetation Contact': 2, 'Conductor Damage': 2, 'Transformer Overload': 1, 'Illegal Tap': 0, 'Grounding Fault': 0 },
]

const voltageData = Array.from({ length: 30 }, (_, i) => ({
  day: `Aug ${i + 1}`,
  'Zone 1': +(0.98 + Math.random() * 0.03).toFixed(3),
  'Zone 2': +(0.97 + Math.random() * 0.04).toFixed(3),
  'Zone 3': i === 17 ? 0.612 : +(0.97 + Math.random() * 0.04).toFixed(3),
  'Zone 4': +(0.96 + Math.random() * 0.05).toFixed(3),
  'Zone 5': +(0.99 + Math.random() * 0.02).toFixed(3),
}))

const pieData = [
  { name: 'Vegetation Contact',   value: 38 },
  { name: 'Conductor Damage',     value: 24 },
  { name: 'Transformer Overload', value: 18 },
  { name: 'Grounding Fault',      value: 12 },
  { name: 'Illegal Tap',          value: 8 },
]

const heatmapData = Array.from({ length: 5 }, (_, sec) =>
  Array.from({ length: 24 }, (_, hr) => {
    const isFaultWindow = sec === 2 && hr >= 14 && hr <= 16
    return isFaultWindow ? 4.8 + Math.random() : 0.2 + Math.random() * 0.5
  })
)

function HeatCell({ val }: { val: number }) {
  const intensity = Math.min(val / 5, 1)
  const r = Math.round(34 + (239 - 34) * intensity)
  const g = Math.round(197 - 140 * intensity)
  const b = Math.round(94 - 84 * intensity)
  return (
    <div
      className="h-6 rounded-md transition hover:scale-110 cursor-pointer"
      style={{ background: `rgb(${r},${g},${b})`, opacity: 0.88 }}
      title={`Anomaly Score: ${val.toFixed(2)}`}
    />
  )
}

const IEEE_RELIABILITY_METRICS = [
  { label: 'SAIDI (Avg Outage Duration)', value: '24.2 min', sub: '-14% vs Last Month', up: false, icon: Clock, color: 'text-emerald-400' },
  { label: 'SAIFI (Outage Frequency)',   value: '0.38 / cust', sub: 'Target < 0.50', up: false, icon: Activity, color: 'text-electric' },
  { label: 'CAIDI (Avg Restoration)',     value: '63.6 min', sub: 'Crew MTTR Improved', up: false, icon: Zap, color: 'text-amber-400' },
  { label: 'ASAI (System Availability)', value: '99.954%', sub: 'IEEE 1366 Compliant', up: true, icon: ShieldCheck, color: 'text-purple-300' },
]

const CTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-[#0b1322] border border-white/10 rounded-xl p-3 text-xs space-y-1 shadow-2xl">
      <p className="font-mono text-gray-400 font-bold">{label}</p>
      {payload.map((p: any) => (
        <p key={p.name} style={{ color: p.color ?? p.fill }} className="font-mono">
          {p.name}: <strong>{p.value}</strong>
        </p>
      ))}
    </div>
  )
}

export default function Analytics() {
  const [selectedZoneFilter, setSelectedZoneFilter] = useState('ALL')

  const handleExportPdfReport = () => {
    generatePdfReport({
      title: 'MSEDCL Pune Circle Monthly Grid Reliability & Outage Audit',
      subtitle: 'IEEE 1366 Standard Reliability Performance & Outage Metrics',
      summaryStats: [
        { label: 'SAIDI Index', value: '24.2 min' },
        { label: 'SAIFI Index', value: '0.38 / cust' },
        { label: 'ASAI Availability', value: '99.954%' },
        { label: 'Total Incidents', value: 48 },
      ],
      headers: ['Substation Zone', 'Vegetation', 'Conductor', 'Overload', 'Grounding', 'Illegal Tap'],
      rows: faultBySection.map(f => [
        f.section,
        f['Vegetation Contact'],
        f['Conductor Damage'],
        f['Transformer Overload'],
        f['Grounding Fault'],
        f['Illegal Tap']
      ])
    })
  }

  return (
    <div className="flex flex-col h-full overflow-y-auto bg-[#080d1a] space-y-6">
      <Header title="Grid Reliability & Historical Analytics" />

      <div className="p-6 space-y-6 max-w-7xl mx-auto w-full">
        
        {/* Top Header Card */}
        <div className="bg-[#0d1626] border border-electric/20 rounded-2xl p-6 shadow-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-electric/15 border border-electric/30 flex items-center justify-center text-electric">
              <Activity className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-lg font-black text-white flex items-center gap-2">
                Pune Circle Grid Analytics & Outage Heatmaps
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-mono font-bold border border-emerald-500/30">
                  IEEE 1366 Standard
                </span>
              </h1>
              <p className="text-xs text-gray-400 mt-1">
                Comprehensive SAIDI/SAIFI reliability metrics, voltage sag waveforms, and feeder anomaly thermal matrices.
              </p>
            </div>
          </div>

          <button
            onClick={handleExportPdfReport}
            className="px-4 py-2 bg-electric hover:bg-electric/90 text-[#070d18] rounded-xl text-xs font-extrabold flex items-center gap-2 shadow-lg shadow-electric/20 transition cursor-pointer"
          >
            <FileText className="w-4 h-4" />
            <span>Export Analytics Report (PDF)</span>
          </button>
        </div>

        {/* IEEE Reliability KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {IEEE_RELIABILITY_METRICS.map(({ label, value, sub, up, icon: Icon, color }) => (
            <div key={label} className="bg-[#0d1626] border border-white/10 rounded-2xl p-4 space-y-1 shadow-xl">
              <div className="flex items-center justify-between">
                <p className="text-[11px] text-gray-400 font-bold uppercase tracking-wider">{label}</p>
                <Icon className={`w-4 h-4 ${color}`} />
              </div>
              <p className={`font-mono font-black text-2xl ${color}`}>{value}</p>
              <div className="flex items-center gap-1 text-[11px]">
                {up
                  ? <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
                  : <TrendingDown className="w-3.5 h-3.5 text-emerald-400" />
                }
                <span className="text-emerald-400 font-medium">{sub}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Controls: Zone Filter */}
        <div className="bg-[#0d1626] border border-white/10 rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[11px] text-gray-400 font-bold uppercase tracking-wider mr-1 flex items-center gap-1">
              <Filter className="w-3.5 h-3.5 text-electric" /> Substation Zone:
            </span>
            {['ALL', 'Zone 1 (Kothrud)', 'Zone 2 (Paud Rd)', 'Zone 3 (Kondhwa)', 'Zone 4 (Hadapsar)', 'Zone 5 (Swargate)'].map(z => (
              <button
                key={z}
                onClick={() => setSelectedZoneFilter(z)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                  selectedZoneFilter === z
                    ? 'bg-electric text-[#070d18] shadow'
                    : 'bg-white/5 text-gray-400 hover:text-white border border-white/5'
                }`}
              >
                {z}
              </button>
            ))}
          </div>
        </div>

        {/* Stacked Bar Chart: Fault Frequency */}
        <div className="bg-[#0d1626] border border-white/10 rounded-2xl p-5 shadow-2xl space-y-3">
          <p className="text-xs font-bold text-gray-200 uppercase tracking-wider flex items-center gap-2">
            <Zap className="w-4 h-4 text-electric" />
            Monthly Fault Incident Frequency by Zone (Last 30 Days)
          </p>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={faultBySection} margin={{ left: -10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
              <XAxis dataKey="section" tick={{ fill: '#94A3B8', fontSize: 11 }} />
              <YAxis tick={{ fill: '#94A3B8', fontSize: 11 }} />
              <Tooltip content={<CTooltip />} />
              <Legend iconSize={10} wrapperStyle={{ fontSize: '11px', color: '#CBD5E1' }} />
              {Object.entries(FAULT_COLORS).map(([name, color]) => (
                <Bar key={name} dataKey={name} stackId="a" fill={color} radius={[3, 3, 0, 0]} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Voltage Sag Line + Fault Pie Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7 bg-[#0d1626] border border-white/10 rounded-2xl p-5 shadow-2xl space-y-3">
            <p className="text-xs font-bold text-gray-200 uppercase tracking-wider flex items-center gap-2">
              <Activity className="w-4 h-4 text-electric" />
              Daily Average Voltage Per-Unit Waveform (30-Day Trend)
            </p>
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={voltageData} margin={{ left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                <XAxis dataKey="day" tick={{ fill: '#94A3B8', fontSize: 10 }} interval={4} />
                <YAxis domain={[0.55, 1.1]} tick={{ fill: '#94A3B8', fontSize: 10 }} />
                <Tooltip content={<CTooltip />} />
                <Legend iconSize={8} wrapperStyle={{ fontSize: '10px' }} />
                {['Zone 1','Zone 2','Zone 3','Zone 4','Zone 5'].map((s, i) => (
                  <Line key={s} type="monotone" dataKey={s} stroke={['#00D4FF','#22C55E','#EF4444','#F59E0B','#A855F7'][i]} dot={false} strokeWidth={2} />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="lg:col-span-5 bg-[#0d1626] border border-white/10 rounded-2xl p-5 shadow-2xl space-y-3">
            <p className="text-xs font-bold text-gray-200 uppercase tracking-wider flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-400" />
              Fault Type Distribution Breakdown
            </p>
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie data={pieData} dataKey="value" cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={4}>
                  {pieData.map((entry, i) => (
                    <Cell key={i} fill={Object.values(FAULT_COLORS)[i]} />
                  ))}
                </Pie>
                <Tooltip content={<CTooltip />} formatter={(v) => [`${v}%`]} />
                <Legend iconSize={8} wrapperStyle={{ fontSize: '11px' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Anomaly Heatmap Matrix */}
        <div className="bg-[#0d1626] border border-white/10 rounded-2xl p-5 shadow-2xl space-y-4">
          <p className="text-xs font-bold text-gray-200 uppercase tracking-wider flex items-center gap-2">
            <Activity className="w-4 h-4 text-red-400" />
            24-Hour Feeder Anomaly & Thermal Stress Heatmap Matrix
          </p>
          <div className="space-y-2">
            <div className="grid gap-1.5" style={{ gridTemplateColumns: '120px repeat(24, 1fr)' }}>
              <div />
              {Array.from({ length: 24 }, (_, h) => (
                <p key={h} className="text-[10px] text-center text-gray-400 font-mono font-bold">{h}:00</p>
              ))}
            </div>
            {heatmapData.map((row, sec) => (
              <div key={sec} className="grid gap-1.5 items-center" style={{ gridTemplateColumns: '120px repeat(24, 1fr)' }}>
                <p className="text-[11px] text-gray-300 font-mono font-bold">Zone {sec + 1}</p>
                {row.map((val, hr) => <HeatCell key={hr} val={val} />)}
              </div>
            ))}
            <div className="flex items-center gap-2 mt-3 justify-end text-xs">
              <span className="text-[11px] text-gray-400">Normal (0.2)</span>
              <div className="w-32 h-2.5 rounded-full" style={{ background: 'linear-gradient(to right, #22C55E, #F59E0B, #EF4444)' }} />
              <span className="text-[11px] text-red-400 font-bold">Anomaly Peak (5.0)</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
