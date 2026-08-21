import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts'
import { Activity } from 'lucide-react'
import { useGridStore } from '../../store/gridStore'
import { formatDate } from '../../lib/utils'

interface Props {
  sectionId?: number
}

export function SensorTimeSeries({ sectionId = 3 }: Props) {
  const { sensorHistory, latestReadings } = useGridStore()
  const readings = sensorHistory[sectionId] ?? []
  const latest   = latestReadings[sectionId]

  const chartData = readings.slice(-30).map(r => ({
    t:           formatDate(r.timestamp),
    voltage:     +(r.voltage_pu * 100).toFixed(2),
    current:     +r.current_A.toFixed(1),
    temperature: +r.temp_C.toFixed(1),
    anomaly:     +r.anomaly_score.toFixed(2),
  }))

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null
    return (
      <div className="bg-navy-700 border border-white/10 rounded-lg p-3 text-xs space-y-1">
        <p className="font-mono text-gray-400">{label}</p>
        {payload.map((p: any) => (
          <p key={p.dataKey} style={{ color: p.color }}>
            {p.name}: <strong>{p.value}</strong>
          </p>
        ))}
      </div>
    )
  }

  return (
    <div className="card flex flex-col gap-3">
      <div className="card-header">
        <Activity className="w-4 h-4 text-electric" />
        Live Sensor Data — Sec {sectionId}
        {latest && (
          <span className="ml-auto flex items-center gap-1 text-fault-normal text-[10px] font-mono">
            <span className="h-1.5 w-1.5 rounded-full bg-fault-normal animate-pulse" />
            LIVE
          </span>
        )}
      </div>

      {readings.length === 0 ? (
        <div className="h-40 flex items-center justify-center text-gray-500 text-sm">
          Waiting for sensor data…
        </div>
      ) : (
        <>
          {/* Quick stats */}
          {latest && (
            <div className="grid grid-cols-3 gap-2 mb-1">
              {[
                { label: 'Voltage', value: `${latest.voltage_pu.toFixed(3)} pu`, color: '#00D4FF' },
                { label: 'Current', value: `${latest.current_A.toFixed(0)} A`,   color: '#EF4444' },
                { label: 'Temp',    value: `${latest.temp_C.toFixed(1)} °C`,      color: '#F59E0B' },
              ].map(({ label, value, color }) => (
                <div key={label} className="bg-navy-800 rounded-lg p-2 text-center">
                  <p className="text-[10px] text-gray-500">{label}</p>
                  <p className="font-mono text-sm font-bold" style={{ color }}>{value}</p>
                </div>
              ))}
            </div>
          )}

          <ResponsiveContainer width="100%" height={160}>
            <LineChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
              <XAxis dataKey="t" tick={{ fill: '#6B7280', fontSize: 9 }} interval="preserveStartEnd" />
              <YAxis tick={{ fill: '#6B7280', fontSize: 9 }} />
              <Tooltip content={<CustomTooltip />} />
              <Legend iconSize={8} wrapperStyle={{ fontSize: '10px', paddingTop: '8px' }} />
              <Line type="monotone" dataKey="voltage"     name="Voltage %" stroke="#00D4FF" dot={false} strokeWidth={1.5} />
              <Line type="monotone" dataKey="current"     name="Current A"  stroke="#EF4444" dot={false} strokeWidth={1.5} />
              <Line type="monotone" dataKey="temperature" name="Temp °C"    stroke="#F59E0B" dot={false} strokeWidth={1.5} />
            </LineChart>
          </ResponsiveContainer>
        </>
      )}
    </div>
  )
}
