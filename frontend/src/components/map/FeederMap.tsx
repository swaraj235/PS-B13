import { MapContainer, TileLayer, Polyline, Marker, Popup, Tooltip } from 'react-leaflet'
import L from 'leaflet'
import { useGridStore } from '../../store/gridStore'
import { STATUS_COLORS } from '../../lib/constants'
import { faultTypeLabel } from '../../lib/utils'
import type { SectionStatus } from '../../types'

// Fix Leaflet icon paths
delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl:       'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl:     'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
})

const SECTION_LINES: [number, number][][] = [
  [[18.500, 73.800], [18.515, 73.820]],
  [[18.515, 73.820], [18.525, 73.840]],
  [[18.525, 73.840], [18.535, 73.860]],
  [[18.535, 73.860], [18.542, 73.880]],
  [[18.542, 73.880], [18.548, 73.900]],
]

const SECTION_MIDPOINTS: [number, number][] = [
  [18.507, 73.810],
  [18.520, 73.830],
  [18.530, 73.850],
  [18.538, 73.870],
  [18.545, 73.890],
]

const CREW_ROUTE: [number, number][] = [
  [18.490, 73.780],
  [18.500, 73.800],
  [18.515, 73.820],
  [18.525, 73.840],
  [18.530, 73.850],
]

function faultIcon(color: string) {
  return L.divIcon({
    html: `<div style="width:20px;height:20px;border-radius:50%;background:${color};border:3px solid white;box-shadow:0 0 12px ${color}"></div>`,
    className: '',
    iconSize: [20, 20],
    iconAnchor: [10, 10],
  })
}

export function FeederMap() {
  const { sections, activeAlert } = useGridStore()

  const sectionStatus: Record<number, SectionStatus> = {}
  sections.forEach(s => { sectionStatus[s.id] = s.status })

  return (
    <div className="card flex flex-col gap-3">
      <div className="card-header">
        <span className="text-electric">⚡</span>
        Feeder Map — IEEE 33-Bus Network
        {activeAlert && (
          <span className="ml-auto flex items-center gap-1 px-2 py-0.5 rounded-full bg-fault-critical/15 border border-fault-critical/30 text-fault-critical text-[10px] font-mono animate-pulse">
            ⚠ FAULT: SEC {activeAlert.section_id}
          </span>
        )}
      </div>

      <div className="relative rounded-lg overflow-hidden" style={{ height: 280 }}>
        <MapContainer
          center={[18.524, 73.850]}
          zoom={12}
          style={{ height: '100%', width: '100%' }}
          zoomControl={true}
          scrollWheelZoom={false}
        >
          <TileLayer
            attribution='&copy; <a href="https://openstreetmap.org">OSM</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {/* Feeder lines */}
          {SECTION_LINES.map((coords, idx) => {
            const secId  = idx + 1
            const status = sectionStatus[secId] ?? 'normal'
            const color  = STATUS_COLORS[status]
            const isCrit = status === 'critical'
            return (
              <Polyline
                key={secId}
                positions={coords}
                pathOptions={{
                  color,
                  weight: isCrit ? 5 : 3,
                  opacity: isCrit ? 1 : 0.85,
                  dashArray: isCrit ? undefined : undefined,
                }}
              >
                <Tooltip permanent={isCrit} direction="top">
                  <div style={{ fontFamily: 'monospace', fontSize: '11px' }}>
                    <strong>Section {secId}</strong> — {status.toUpperCase()}
                  </div>
                </Tooltip>
              </Polyline>
            )
          })}

          {/* Fault marker on critical section */}
          {sections.filter(s => s.status === 'critical').map(s => (
            <Marker
              key={s.id}
              position={SECTION_MIDPOINTS[s.id - 1]}
              icon={faultIcon('#EF4444')}
            >
              <Popup>
                <div style={{ fontFamily: 'monospace', fontSize: '12px', minWidth: '160px' }}>
                  <strong style={{ color: '#EF4444' }}>⚠ CRITICAL FAULT</strong><br />
                  Section: {s.id}<br />
                  Probability: {(s.fault_probability * 100).toFixed(1)}%<br />
                  {activeAlert && `Type: ${faultTypeLabel(activeAlert.fault_type)}`}
                </div>
              </Popup>
            </Marker>
          ))}

          {/* Crew route */}
          {activeAlert && (
            <Polyline
              positions={CREW_ROUTE}
              pathOptions={{ color: '#00D4FF', weight: 2, dashArray: '8 6', opacity: 0.9 }}
            >
              <Tooltip>Crew Route → Sec {activeAlert.section_id}</Tooltip>
            </Polyline>
          )}
        </MapContainer>

        {/* Legend */}
        <div className="absolute bottom-3 left-3 bg-navy-800/90 backdrop-blur rounded-lg p-2 z-[1000] text-[10px] space-y-1">
          {[
            { color: '#22C55E', label: 'Normal' },
            { color: '#F59E0B', label: 'Warning' },
            { color: '#EF4444', label: 'Critical' },
            { color: '#00D4FF', label: 'Crew Route', dashed: true },
          ].map(({ color, label, dashed }) => (
            <div key={label} className="flex items-center gap-1.5">
              <div
                className="w-5 h-0.5 rounded"
                style={{ background: color, borderTop: dashed ? `2px dashed ${color}` : undefined }}
              />
              <span className="text-gray-400">{label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
