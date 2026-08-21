import { useEffect, useRef, useState } from 'react'
import { MapContainer, TileLayer, Polyline, Marker, Popup, Tooltip, useMap } from 'react-leaflet'
import L from 'leaflet'
import { MapPin, Navigation, Info } from 'lucide-react'
import { useGridStore } from '../../store/gridStore'
import { STATUS_COLORS } from '../../lib/constants'
import { faultTypeLabel } from '../../lib/utils'
import type { SectionStatus } from '../../types'

// Fix Leaflet default icon paths
delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl:       'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl:     'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
})

// ── Static feeder topology (IEEE 33-Bus academic demo, Pune area) ────────────
// NOTE: These 5 sections are a *synthetic* representation used for the demo.
// They do NOT map to real MSEDCL Pune distribution lines.
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
  [18.490, 73.780], [18.500, 73.800],
  [18.515, 73.820], [18.525, 73.840], [18.530, 73.850],
]

// ── Icon helpers ─────────────────────────────────────────────────────────────
function faultIcon(color: string) {
  return L.divIcon({
    html: `<div style="width:20px;height:20px;border-radius:50%;background:${color};border:3px solid white;box-shadow:0 0 14px ${color}"></div>`,
    className: '', iconSize: [20, 20], iconAnchor: [10, 10],
  })
}

function gpsIcon() {
  return L.divIcon({
    html: `
      <div style="position:relative;width:20px;height:20px">
        <div style="width:20px;height:20px;border-radius:50%;background:#00D4FF;border:3px solid white;box-shadow:0 0 12px #00D4FF;opacity:0.9"></div>
        <div style="position:absolute;inset:-6px;border-radius:50%;border:2px solid rgba(0,212,255,0.4);animation:ping 1.5s ease-out infinite"></div>
      </div>
      <style>@keyframes ping{0%{transform:scale(1);opacity:0.8}100%{transform:scale(2.2);opacity:0}}</style>
    `,
    className: '', iconSize: [20, 20], iconAnchor: [10, 10],
  })
}

// ── Helper to smoothly fly the map to new centre ─────────────────────────────
function MapController({ center, zoom }: { center: [number, number]; zoom: number }) {
  const map = useMap()
  const prevCenter = useRef<[number, number]>([0, 0])
  useEffect(() => {
    if (prevCenter.current[0] !== center[0] || prevCenter.current[1] !== center[1]) {
      map.flyTo(center, zoom, { duration: 1.4, easeLinearity: 0.3 })
      prevCenter.current = center
    }
  }, [center, zoom, map])
  return null
}

// ── Main component ────────────────────────────────────────────────────────────
export function FeederMap() {
  const { sections, activeAlert, selectedSectionId, setSelectedSectionId } = useGridStore()

  const [mapCenter, setMapCenter] = useState<[number, number]>([18.524, 73.850])
  const [mapZoom,   setMapZoom]   = useState(12)
  const [userPos,   setUserPos]   = useState<[number, number] | null>(null)
  const [gpsError,  setGpsError]  = useState<string | null>(null)
  const [tracking,  setTracking]  = useState(false)
  const watchId = useRef<number | null>(null)

  const sectionStatus: Record<number, SectionStatus> = {}
  sections.forEach(s => { sectionStatus[s.id] = s.status })

  // Start / stop live GPS watch
  const toggleGPS = () => {
    if (tracking) {
      // Stop
      if (watchId.current !== null) navigator.geolocation.clearWatch(watchId.current)
      setTracking(false)
      setGpsError(null)
      return
    }
    if (!navigator.geolocation) {
      setGpsError('Geolocation not supported by this browser')
      return
    }
    setGpsError(null)
    setTracking(true)
    watchId.current = navigator.geolocation.watchPosition(
      pos => {
        const coords: [number, number] = [pos.coords.latitude, pos.coords.longitude]
        setUserPos(coords)
        setMapCenter(coords)
        setMapZoom(15)
      },
      err => {
        setGpsError(`GPS error: ${err.message}`)
        setTracking(false)
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 2000 }
    )
  }

  // Cleanup on unmount
  useEffect(() => () => {
    if (watchId.current !== null) navigator.geolocation.clearWatch(watchId.current)
  }, [])

  return (
    <div className="card flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <div className="card-header mb-0">
            <span className="text-electric">⚡</span>
            Feeder Map — IEEE 33-Bus Network
            {activeAlert && (
              <span className="ml-3 px-2.5 py-0.5 rounded-full bg-red-500/20 border border-red-500/40 text-red-400 text-xs font-bold animate-pulse">
                ⚠ FAULT: SEC {activeAlert.section_id}
              </span>
            )}
          </div>
          <p className="text-[11px] text-amber-400/80 flex items-center gap-1 mt-0.5">
            <Info className="w-3 h-3 flex-shrink-0" />
            Demo topology (IEEE 33-Bus benchmark) — not the real MSEDCL Pune grid
          </p>
        </div>

        {/* GPS button */}
        <button
          onClick={toggleGPS}
          className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-bold transition-all ${
            tracking
              ? 'bg-electric/20 border-electric/50 text-electric'
              : 'bg-navy-700/60 border-white/15 text-gray-300 hover:text-electric hover:border-electric/40'
          }`}
        >
          {tracking
            ? <Navigation className="w-3.5 h-3.5 animate-spin" />
            : <MapPin className="w-3.5 h-3.5" />
          }
          {tracking ? 'GPS: Live ●' : 'Enable Live GPS'}
        </button>
      </div>

      {gpsError && (
        <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
          ⚠ {gpsError}
        </p>
      )}

      {tracking && userPos && (
        <p className="text-xs text-electric/80 bg-electric/10 border border-electric/20 rounded-lg px-3 py-2">
          📍 Live GPS — {userPos[0].toFixed(5)}°N, {userPos[1].toFixed(5)}°E (updating automatically)
        </p>
      )}

      {/* Map */}
      <div className="relative rounded-xl overflow-hidden border border-white/10" style={{ height: 300 }}>
        <MapContainer
          center={mapCenter}
          zoom={mapZoom}
          attributionControl={false}
          style={{ height: '100%', width: '100%' }}
          scrollWheelZoom={false}
        >
          <MapController center={mapCenter} zoom={mapZoom} />
          <TileLayer attribution="" url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

          {/* Feeder section lines */}
          {SECTION_LINES.map((coords, idx) => {
            const secId    = idx + 1
            const status   = sectionStatus[secId] ?? 'normal'
            const color    = STATUS_COLORS[status]
            const isCrit   = status === 'critical'
            const isSel    = secId === selectedSectionId
            return (
              <Polyline
                key={secId}
                positions={coords}
                eventHandlers={{ click: () => setSelectedSectionId(secId) }}
                pathOptions={{
                  color:   isSel ? '#00D4FF' : color,
                  weight:  isCrit ? 7 : isSel ? 6 : 4,
                  opacity: isCrit || isSel ? 1 : 0.8,
                }}
              >
                <Tooltip direction="top" permanent={isSel}>
                  <span style={{ fontFamily: 'monospace', fontSize: '11px', fontWeight: 700 }}>
                    Section {secId} — {status.toUpperCase()}
                  </span>
                </Tooltip>
              </Polyline>
            )
          })}

          {/* Critical fault markers */}
          {sections.filter(s => s.status === 'critical').map(s => (
            <Marker
              key={s.id}
              position={SECTION_MIDPOINTS[s.id - 1]}
              icon={faultIcon('#EF4444')}
              eventHandlers={{ click: () => setSelectedSectionId(s.id) }}
            >
              <Popup>
                <div style={{ fontFamily: 'monospace', minWidth: '160px' }}>
                  <strong style={{ color: '#EF4444' }}>⚠ CRITICAL FAULT</strong><br />
                  Section: {s.id}<br />
                  Probability: {(s.fault_probability * 100).toFixed(1)}%<br />
                  {activeAlert && `Type: ${faultTypeLabel(activeAlert.fault_type)}`}
                </div>
              </Popup>
            </Marker>
          ))}

          {/* Live GPS pin */}
          {userPos && (
            <Marker position={userPos} icon={gpsIcon()}>
              <Popup>
                <div style={{ fontFamily: 'monospace' }}>
                  <strong style={{ color: '#00D4FF' }}>📍 Your Live Location</strong><br />
                  {userPos[0].toFixed(5)}°N, {userPos[1].toFixed(5)}°E<br />
                  <span style={{ fontSize: '10px', color: '#9CA3AF' }}>Updating in real time</span>
                </div>
              </Popup>
            </Marker>
          )}

          {/* Crew dispatch route */}
          {activeAlert && (
            <Polyline
              positions={CREW_ROUTE}
              pathOptions={{ color: '#00D4FF', weight: 2.5, dashArray: '8 6', opacity: 0.9 }}
            >
              <Tooltip>Crew Route → Section {activeAlert.section_id}</Tooltip>
            </Polyline>
          )}
        </MapContainer>

        {/* Map legend */}
        <div className="absolute bottom-3 left-3 bg-[#0d1626]/95 border border-white/10 backdrop-blur-sm rounded-xl p-2.5 z-[1000] text-[10px] space-y-1.5">
          {[
            { color: '#22C55E', label: 'Normal' },
            { color: '#F59E0B', label: 'Warning' },
            { color: '#EF4444', label: 'Critical Fault' },
            { color: '#00D4FF', label: 'Selected / Crew Route', dashed: true },
          ].map(({ color, label, dashed }) => (
            <div key={label} className="flex items-center gap-2">
              <div className="w-5 h-0.5 rounded flex-shrink-0"
                style={{ background: color, borderTop: dashed ? `2px dashed ${color}` : undefined }} />
              <span className="text-gray-300 font-medium">{label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
