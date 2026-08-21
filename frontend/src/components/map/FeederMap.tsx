import { useState } from 'react'
import { MapContainer, TileLayer, Polyline, Marker, Popup, Tooltip } from 'react-leaflet'
import L from 'leaflet'
import { MapPin, Navigation } from 'lucide-react'
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

function userGpsIcon() {
  return L.divIcon({
    html: `<div style="width:16px;height:16px;border-radius:50%;background:#00D4FF;border:3px solid white;box-shadow:0 0 10px #00D4FF"></div>`,
    className: '',
    iconSize: [16, 16],
    iconAnchor: [8, 8],
  })
}

export function FeederMap() {
  const { sections, activeAlert, selectedSectionId, setSelectedSectionId } = useGridStore()
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null)
  const [locating, setLocating] = useState(false)
  const [locationError, setLocationError] = useState<string | null>(null)

  const sectionStatus: Record<number, SectionStatus> = {}
  sections.forEach(s => { sectionStatus[s.id] = s.status })

  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      setLocationError('Geolocation not supported by browser')
      return
    }
    setLocating(true)
    setLocationError(null)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserLocation([pos.coords.latitude, pos.coords.longitude])
        setLocating(false)
      },
      (err) => {
        setLocationError(err.message || 'Failed to acquire location')
        setLocating(false)
      },
      { enableHighAccuracy: true, timeout: 10000 }
    )
  }

  return (
    <div className="card flex flex-col gap-3">
      <div className="card-header">
        <span className="text-electric">⚡</span>
        Feeder Map — IEEE 33-Bus Network (Pune Substation)
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
          attributionControl={false}
          style={{ height: '100%', width: '100%' }}
          zoomControl={true}
          scrollWheelZoom={false}
        >
          <TileLayer
            attribution=""
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {/* Feeder lines */}
          {SECTION_LINES.map((coords, idx) => {
            const secId  = idx + 1
            const status = sectionStatus[secId] ?? 'normal'
            const color  = STATUS_COLORS[status]
            const isCrit = status === 'critical'
            const isSelected = secId === selectedSectionId

            return (
              <Polyline
                key={secId}
                positions={coords}
                eventHandlers={{
                  click: () => setSelectedSectionId(secId),
                }}
                pathOptions={{
                  color: isSelected ? '#00D4FF' : color,
                  weight: isCrit ? 6 : isSelected ? 5 : 3,
                  opacity: isCrit || isSelected ? 1 : 0.85,
                }}
              >
                <Tooltip permanent={isCrit || isSelected} direction="top">
                  <div style={{ fontFamily: 'monospace', fontSize: '11px' }}>
                    <strong>Section {secId}</strong> — {status.toUpperCase()}
                  </div>
                </Tooltip>
              </Polyline>
            )
          })}

          {/* Fault markers */}
          {sections.filter(s => s.status === 'critical').map(s => (
            <Marker
              key={s.id}
              position={SECTION_MIDPOINTS[s.id - 1]}
              icon={faultIcon('#EF4444')}
              eventHandlers={{
                click: () => setSelectedSectionId(s.id),
              }}
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

          {/* User GPS Pin */}
          {userLocation && (
            <Marker position={userLocation} icon={userGpsIcon()}>
              <Popup>
                <div style={{ fontFamily: 'monospace', fontSize: '12px' }}>
                  <strong>📍 Your Location (Live GPS)</strong><br />
                  Lat: {userLocation[0].toFixed(4)}°<br />
                  Lng: {userLocation[1].toFixed(4)}°
                </div>
              </Popup>
            </Marker>
          )}

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

        {/* GPS Control Button */}
        <div className="absolute top-3 right-3 z-[1000] flex flex-col items-end gap-1">
          <button
            onClick={handleGetLocation}
            disabled={locating}
            title="Track Device GPS"
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-navy-800/90 hover:bg-navy-700 text-electric border border-electric/30 text-xs font-mono backdrop-blur transition-all"
          >
            {locating ? <Navigation className="w-3.5 h-3.5 animate-spin text-electric" /> : <MapPin className="w-3.5 h-3.5 text-electric" />}
            {locating ? 'Locating…' : userLocation ? 'GPS Active' : 'My GPS'}
          </button>
          {locationError && (
            <span className="text-[10px] bg-fault-critical/90 text-white px-2 py-0.5 rounded shadow">
              {locationError}
            </span>
          )}
        </div>

        {/* Legend */}
        <div className="absolute bottom-3 left-3 bg-navy-800/90 backdrop-blur rounded-lg p-2 z-[1000] text-[10px] space-y-1">
          {[
            { color: '#22C55E', label: 'Normal' },
            { color: '#F59E0B', label: 'Warning' },
            { color: '#EF4444', label: 'Critical' },
            { color: '#00D4FF', label: 'Crew Route / Active Sec', dashed: true },
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
