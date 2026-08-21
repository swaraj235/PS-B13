import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend
} from 'recharts'
import { Activity, Cpu } from 'lucide-react'
import { useGridStore } from '../../store/gridStore'

interface Props {
  sectionId?: number
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-[#0d1626] border border-white/15 rounded-xl p-3 text-xs space-y-1.5 shadow-xl">
      <p className="font-mono text-gray-400 text-[10px] pb-1 border-b border-white/8">{label}</p>
      {payload.map((p: any) => (
        <p key={p.dataKey} className="flex items-center justify-between gap-4">
          <span style={{ color: p.color }} className="font-semibold">{p.name}</span>
          <span className="font-mono font-bold text-white">{p.value}</span>
        </p>
      ))}
    </div>
  )
}

export function SensorTimeSeries({ sectionId = 3 }: Props) {
  const { sensorHistory, latestReadings } = useGridStore()
  const readings = sensorHistory[sectionId] ?? []
  const latest   = latestReadings[sectionId]

  const chartData = readings.slice(-30).map(r => ({
    t:           new Date(r.timestamp).toLocaleTimeString('en-IN', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    voltage:     +(r.voltage_pu * 100).toFixed(1),
    current:     +r.current_A.toFixed(1),
    temperature: +r.temp_C.toFixed(1),
  }))

  return (
    <div className="card flex flex-col gap-4">
      {/* Header */}
      <div className="card-header justify-between mb-0">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-electric" />
          Live Sensor Telemetry — Section {sectionId}
        </div>
        {latest && (
          <span className="flex items-center gap-1.5 text-green-400 text-xs font-bold font-mono">
            <span className="h-2 w-2 rounded-full bg-green-400 animate-pulse" />
            STREAMING
          </span>
        )}
      </div>

      {/* Stat cards */}
      {latest && (
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Voltage',     value: `${latest.voltage_pu.toFixed(3)} pu`,  color: '#00D4FF', icon: '⚡' },
            { label: 'Current',     value: `${latest.current_A.toFixed(0)} A`,    color: '#EF4444', icon: '🔌' },
            { label: 'Temperature', value: `${latest.temp_C.toFixed(1)} °C`,       color: '#F59E0B', icon: '🌡' },
          ].map(({ label, value, color, icon }) => (
            <div
              key={label}
              className="rounded-xl p-3 text-center border"
              style={{
                background: `${color}12`,
                borderColor: `${color}30`,
              }}
            >
              <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-widest mb-1">
                {icon} {label}
              </p>
              <p className="font-mono text-lg font-bold" style={{ color }}>{value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Chart */}
      {readings.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-36 text-gray-400 text-sm gap-2">
          <Cpu className="w-6 h-6 text-gray-500 animate-pulse" />
          <span>Waiting for telemetry from Section {sectionId}…</span>
          <span className="text-xs text-gray-500">WebSocket streams 1 reading/sec per section</span>
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={150}>
          <LineChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: -22 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
            <XAxis dataKey="t" tick={{ fill: '#6B7280', fontSize: 9 }} interval="preserveStartEnd" />
            <YAxis tick={{ fill: '#6B7280', fontSize: 9 }} />
            <Tooltip content={<CustomTooltip />} />
            <Legend iconSize={8} wrapperStyle={{ fontSize: '11px', paddingTop: '6px', color: '#9CA3AF' }} />
            <Line type="monotone" dataKey="voltage"     name="Voltage %"  stroke="#00D4FF" dot={false} strokeWidth={2} />
            <Line type="monotone" dataKey="current"     name="Current A"   stroke="#EF4444" dot={false} strokeWidth={2} />
            <Line type="monotone" dataKey="temperature" name="Temp °C"     stroke="#F59E0B" dot={false} strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}
