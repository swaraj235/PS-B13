import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts'
import { Header } from '../components/layout/Header'
import { TrendingUp, TrendingDown, Activity, Clock, CheckCircle } from 'lucide-react'

const FAULT_COLORS: Record<string, string> = {
  'Vegetation Contact':   '#22C55E',
  'Conductor Damage':     '#00D4FF',
  'Transformer Overload': '#F59E0B',
  'Illegal Tap':          '#A855F7',
  'Grounding Fault':      '#EF4444',
}

const faultBySection = [
  { section: 'Sec 1', 'Vegetation Contact': 2, 'Conductor Damage': 1, 'Transformer Overload': 0, 'Illegal Tap': 0, 'Grounding Fault': 1 },
  { section: 'Sec 2', 'Vegetation Contact': 1, 'Conductor Damage': 3, 'Transformer Overload': 1, 'Illegal Tap': 0, 'Grounding Fault': 0 },
  { section: 'Sec 3', 'Vegetation Contact': 5, 'Conductor Damage': 2, 'Transformer Overload': 2, 'Illegal Tap': 1, 'Grounding Fault': 0 },
  { section: 'Sec 4', 'Vegetation Contact': 2, 'Conductor Damage': 0, 'Transformer Overload': 2, 'Illegal Tap': 1, 'Grounding Fault': 1 },
  { section: 'Sec 5', 'Vegetation Contact': 1, 'Conductor Damage': 1, 'Transformer Overload': 0, 'Illegal Tap': 0, 'Grounding Fault': 0 },
]

const voltageData = Array.from({ length: 30 }, (_, i) => ({
  day: `D${i + 1}`,
  'Sec 1': +(0.98 + Math.random() * 0.04).toFixed(3),
  'Sec 2': +(0.97 + Math.random() * 0.04).toFixed(3),
  'Sec 3': i === 17 ? 0.612 : +(0.97 + Math.random() * 0.04).toFixed(3),
  'Sec 4': +(0.96 + Math.random() * 0.05).toFixed(3),
  'Sec 5': +(0.99 + Math.random() * 0.02).toFixed(3),
}))

const pieData = [
  { name: 'Vegetation Contact',   value: 38 },
  { name: 'Conductor Damage',     value: 22 },
  { name: 'Transformer Overload', value: 18 },
  { name: 'Grounding Fault',      value: 12 },
  { name: 'Illegal Tap',          value: 10 },
]

const heatmapData = Array.from({ length: 5 }, (_, sec) =>
  Array.from({ length: 24 }, (_, hr) => {
    const isFaultWindow = sec === 2 && hr >= 14 && hr <= 16
    return isFaultWindow ? 4.5 + Math.random() : 0.2 + Math.random() * 0.5
  })
)

function HeatCell({ val }: { val: number }) {
  const intensity = Math.min(val / 5, 1)
  const r = Math.round(34 + (239 - 34) * intensity)
  const g = Math.round(197 - 140 * intensity)
  const b = Math.round(94 - 84 * intensity)
  return (
    <div
      className="h-5 rounded-sm"
      style={{ background: `rgb(${r},${g},${b})`, opacity: 0.85 }}
      title={`Score: ${val.toFixed(2)}`}
    />
  )
}

const METRICS = [
  { label: 'Total Faults (Month)', value: '23', sub: '+8%', up: true,  icon: Activity,    color: 'text-fault-critical' },
  { label: 'Avg Response Time',    value: '18.4 min', sub: '-12%', up: false, icon: Clock, color: 'text-fault-normal'   },
  { label: 'System Uptime',        value: '99.2%',   sub: 'stable',up: false, icon: TrendingUp,  color: 'text-electric' },
  { label: 'Complaints Resolved',  value: '156/167', sub: '93.4%', up: false, icon: CheckCircle, color: 'text-fault-normal' },
]

const CTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-navy-700 border border-white/10 rounded-lg p-3 text-xs space-y-1">
      <p className="font-mono text-gray-400">{label}</p>
      {payload.map((p: any) => (
        <p key={p.name} style={{ color: p.color ?? p.fill }}>
          {p.name}: <strong>{p.value}</strong>
        </p>
      ))}
    </div>
  )
}

export default function Analytics() {
  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Header title="Historical Analytics" />

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Metric Cards */}
        <div className="grid grid-cols-4 gap-4">
          {METRICS.map(({ label, value, sub, up, icon: Icon, color }) => (
            <div key={label} className="metric-card">
              <div className="flex items-center justify-between">
                <p className="text-xs text-gray-400">{label}</p>
                <Icon className={`w-4 h-4 ${color}`} />
              </div>
              <p className={`font-head font-bold text-2xl ${color}`}>{value}</p>
              <div className="flex items-center gap-1 text-xs">
                {up
                  ? <TrendingUp   className="w-3 h-3 text-fault-critical" />
                  : <TrendingDown className="w-3 h-3 text-fault-normal" />
                }
                <span className={up ? 'text-fault-critical' : 'text-fault-normal'}>{sub}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Fault Frequency */}
        <div className="card">
          <p className="card-header">⚡ Fault Events by Section (Last 30 Days)</p>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={faultBySection} margin={{ left: -10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
              <XAxis dataKey="section" tick={{ fill: '#6B7280', fontSize: 11 }} />
              <YAxis tick={{ fill: '#6B7280', fontSize: 11 }} />
              <Tooltip content={<CTooltip />} />
              <Legend iconSize={8} wrapperStyle={{ fontSize: '11px' }} />
              {Object.entries(FAULT_COLORS).map(([name, color]) => (
                <Bar key={name} dataKey={name} stackId="a" fill={color} radius={[2, 2, 0, 0]} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Voltage + Pie */}
        <div className="grid grid-cols-3 gap-4">
          <div className="col-span-2 card">
            <p className="card-header">📉 Daily Avg Voltage Per Unit (5 Sections)</p>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={voltageData} margin={{ left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                <XAxis dataKey="day" tick={{ fill: '#6B7280', fontSize: 9 }} interval={4} />
                <YAxis domain={[0.55, 1.1]} tick={{ fill: '#6B7280', fontSize: 9 }} />
                <Tooltip content={<CTooltip />} />
                <Legend iconSize={8} wrapperStyle={{ fontSize: '10px' }} />
                {['Sec 1','Sec 2','Sec 3','Sec 4','Sec 5'].map((s, i) => (
                  <Line key={s} type="monotone" dataKey={s} stroke={['#00D4FF','#22C55E','#EF4444','#F59E0B','#A855F7'][i]} dot={false} strokeWidth={1.5} />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="card">
            <p className="card-header">🍩 Fault Distribution</p>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={pieData} dataKey="value" cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3}>
                  {pieData.map((entry, i) => (
                    <Cell key={i} fill={Object.values(FAULT_COLORS)[i]} />
                  ))}
                </Pie>
                <Tooltip content={<CTooltip />} formatter={(v) => [`${v}%`]} />
                <Legend iconSize={8} wrapperStyle={{ fontSize: '10px' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Anomaly Heatmap */}
        <div className="card">
          <p className="card-header">🔥 Anomaly Score Heatmap by Section & Hour</p>
          <div className="space-y-1">
            <div className="grid gap-1" style={{ gridTemplateColumns: '60px repeat(24, 1fr)' }}>
              <div />
              {Array.from({ length: 24 }, (_, h) => (
                <p key={h} className="text-[9px] text-center text-gray-600 font-mono">{h}</p>
              ))}
            </div>
            {heatmapData.map((row, sec) => (
              <div key={sec} className="grid gap-1 items-center" style={{ gridTemplateColumns: '60px repeat(24, 1fr)' }}>
                <p className="text-[10px] text-gray-400 font-mono">Sec {sec + 1}</p>
                {row.map((val, hr) => <HeatCell key={hr} val={val} />)}
              </div>
            ))}
            <div className="flex items-center gap-2 mt-2 justify-end">
              <span className="text-[10px] text-gray-500">Low</span>
              <div className="w-24 h-2 rounded" style={{ background: 'linear-gradient(to right, #22C55E, #F59E0B, #EF4444)' }} />
              <span className="text-[10px] text-gray-500">High</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
