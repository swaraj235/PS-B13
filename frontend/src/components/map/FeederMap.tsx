import { useEffect, useRef, useState } from 'react'
import { MapContainer, TileLayer, Polyline, Marker, Popup, Tooltip, useMap } from 'react-leaflet'
import L from 'leaflet'
import { Layers, Zap } from 'lucide-react'
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

// ── Substation Zone Definitions for Pune Circle ────────────────────────────────
export interface SubstationZone {
  id: string
  name: string
  area: string
  voltage: string
  consumers: string
  center: [number, number]
  zoom: number
  feederLines: [number, number][][]
  midpoints: [number, number][]
}

export const PUNE_SUBSTATIONS: Record<string, SubstationZone> = {
  all_pune: {
    id: 'all_pune',
    name: 'IEEE 33-Bus Benchmark (Pune Circle Overview)',
    area: 'Pune Metropolitan Region',
    voltage: '33kV / 11kV',
    consumers: '1,20,000+',
    center: [18.524, 73.850],
    zoom: 12,
    feederLines: [
      [[18.500, 73.800], [18.515, 73.820]],
      [[18.515, 73.820], [18.525, 73.840]],
      [[18.525, 73.840], [18.535, 73.860]],
      [[18.535, 73.860], [18.542, 73.880]],
      [[18.542, 73.880], [18.548, 73.900]],
    ],
    midpoints: [
      [18.507, 73.810],
      [18.520, 73.830],
      [18.530, 73.850],
      [18.538, 73.870],
      [18.545, 73.890],
    ]
  },
  kondhwa: {
    id: 'kondhwa',
    name: 'Kondhwa 22/11kV Substation',
    area: 'Kondhwa Budruk, Khurd, Undri, NIBM & Pisoli',
    voltage: '22kV / 11kV',
    consumers: '48,500',
    center: [18.468, 73.890],
    zoom: 14,
    feederLines: [
      [[18.464, 73.885], [18.472, 73.892]], // Sec 1: Kondhwa Budruk Main Line
      [[18.472, 73.892], [18.478, 73.899]], // Sec 2: NIBM Rd Feeder
      [[18.478, 73.899], [18.465, 73.908]], // Sec 3: Undri-Pisoli Line
      [[18.465, 73.908], [18.455, 73.918]], // Sec 4: Katraj-Kondhwa Bypass
      [[18.455, 73.918], [18.448, 73.928]], // Sec 5: Yeolewadi / Saswad Link
    ],
    midpoints: [
      [18.468, 73.888],
      [18.475, 73.895],
      [18.471, 73.903],
      [18.460, 73.913],
      [18.451, 73.923],
    ]
  },
  kothrud: {
    id: 'kothrud',
    name: 'Kothrud 11kV Substation',
    area: 'Kothrud, Warje, Karve Nagar & Erandwane',
    voltage: '11kV',
    consumers: '62,000',
    center: [18.507, 73.805],
    zoom: 14,
    feederLines: [
      [[18.501, 73.800], [18.508, 73.810]], // Sec 1: Karve Rd Feeder
      [[18.508, 73.810], [18.514, 73.818]], // Sec 2: Paud Rd / Ideal Colony
      [[18.514, 73.818], [18.495, 73.812]], // Sec 3: Warje Malwadi Line
      [[18.495, 73.812], [18.486, 73.820]], // Sec 4: Karve Nagar Feeder
      [[18.486, 73.820], [18.478, 73.828]], // Sec 5: Cummins College Link
    ],
    midpoints: [
      [18.504, 73.805],
      [18.511, 73.814],
      [18.504, 73.815],
      [18.490, 73.816],
      [18.482, 73.824],
    ]
  },
  hadapsar: {
    id: 'hadapsar',
    name: 'Hadapsar 22kV Substation',
    area: 'Hadapsar, Magarpatta, Amanora & Mundhwa',
    voltage: '22kV',
    consumers: '74,000',
    center: [18.508, 73.926],
    zoom: 14,
    feederLines: [
      [[18.502, 73.920], [18.512, 73.928]], // Sec 1: Solapur Rd Feeder
      [[18.512, 73.928], [18.520, 73.935]], // Sec 2: Magarpatta Cybercity
      [[18.520, 73.935], [18.528, 73.945]], // Sec 3: Amanora Town Feeder
      [[18.528, 73.945], [18.535, 73.952]], // Sec 4: Mundhwa Industrial Feeder
      [[18.535, 73.952], [18.542, 73.960]], // Sec 5: Keshavnagar Feeder
    ],
    midpoints: [
      [18.507, 73.924],
      [18.516, 73.931],
      [18.524, 73.940],
      [18.531, 73.948],
      [18.538, 73.956],
    ]
  },
  swargate: {
    id: 'swargate',
    name: 'Swargate / Camp Substation',
    area: 'Swargate, Camp, Parvati, Sarasbaug & Shivajinagar',
    voltage: '11kV',
    consumers: '58,000',
    center: [18.501, 73.858],
    zoom: 14,
    feederLines: [
      [[18.498, 73.855], [18.505, 73.865]], // Sec 1: Shankarsheth Rd Feeder
      [[18.505, 73.865], [18.515, 73.875]], // Sec 2: MG Road Camp Line
      [[18.515, 73.875], [18.525, 73.865]], // Sec 3: Pune Station Feeder
      [[18.525, 73.865], [18.530, 73.852]], // Sec 4: Shivajinagar Line
      [[18.530, 73.852], [18.490, 73.848]], // Sec 5: Parvati Hill Feeder
    ],
    midpoints: [
      [18.501, 73.860],
      [18.510, 73.870],
      [18.520, 73.870],
      [18.527, 73.858],
      [18.510, 73.850],
    ]
  }
}

// ── Icon helpers ─────────────────────────────────────────────────────────────
function faultIcon(color: string) {
  return L.divIcon({
    html: `<div style="width:20px;height:20px;border-radius:50%;background:${color};border:3px solid white;box-shadow:0 0 14px ${color}"></div>`,
    className: '', iconSize: [20, 20], iconAnchor: [10, 10],
  })
}

// ── Map controller ────────────────────────────────────────────────────────────
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

  const [selectedSubstationKey, setSelectedSubstationKey] = useState<string>('kondhwa')
  const currentZone = PUNE_SUBSTATIONS[selectedSubstationKey] || PUNE_SUBSTATIONS.all_pune

  const [mapCenter, setMapCenter] = useState<[number, number]>(currentZone.center)
  const [mapZoom,   setMapZoom]   = useState(currentZone.zoom)

  // Update map position when substation dropdown changes
  const handleSubstationChange = (key: string) => {
    setSelectedSubstationKey(key)
    const zone = PUNE_SUBSTATIONS[key]
    if (zone) {
      setMapCenter(zone.center)
      setMapZoom(zone.zoom)
    }
  }

  const sectionStatus: Record<number, SectionStatus> = {}
  sections.forEach(s => { sectionStatus[s.id] = s.status })

  return (
    <div className="card flex flex-col gap-4">
      {/* Header with Substation Zone Dropdown */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <div className="card-header mb-0">
            <span className="text-electric">⚡</span>
            Feeder Map — Pune Circle GIS
            {activeAlert && (
              <span className="ml-3 px-2.5 py-0.5 rounded-full bg-red-500/20 border border-red-500/40 text-red-400 text-xs font-bold animate-pulse">
                ⚠ FAULT: SEC {activeAlert.section_id}
              </span>
            )}
          </div>
          <p className="text-[11px] text-gray-400 flex items-center gap-1 mt-0.5 font-medium">
            <Layers className="w-3 h-3 text-electric" />
            {currentZone.name} — {currentZone.area} ({currentZone.consumers} consumers)
          </p>
        </div>

        {/* Substation Dropdown */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 bg-[#0a1525] border border-electric/30 rounded-xl px-3 py-1.5">
            <Zap className="w-3.5 h-3.5 text-electric" />
            <select
              value={selectedSubstationKey}
              onChange={e => handleSubstationChange(e.target.value)}
              className="bg-transparent text-xs font-bold text-white focus:outline-none cursor-pointer"
            >
              {Object.entries(PUNE_SUBSTATIONS).map(([key, zone]) => (
                <option key={key} value={key} className="bg-[#0a1525] text-white">
                  📍 {zone.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Map view */}
      <div className="relative rounded-xl overflow-hidden border border-white/10" style={{ height: 320 }}>
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
          {currentZone.feederLines.map((coords, idx) => {
            const secId    = idx + 1
            const status   = sectionStatus[secId] ?? 'normal'
            const color    = STATUS_COLORS[status]
            const isCrit   = status === 'critical'
            const isSel    = secId === selectedSectionId
            return (
              <Polyline
                key={`${selectedSubstationKey}-sec-${secId}`}
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
          {sections.filter(s => s.status === 'critical').map(s => {
            const midpoint = currentZone.midpoints[s.id - 1] || currentZone.center
            return (
              <Marker
                key={`fault-${s.id}`}
                position={midpoint}
                icon={faultIcon('#EF4444')}
                eventHandlers={{ click: () => setSelectedSectionId(s.id) }}
              >
                <Popup>
                  <div style={{ fontFamily: 'monospace', minWidth: '160px' }}>
                    <strong style={{ color: '#EF4444' }}>⚠ CRITICAL FAULT</strong><br />
                    Substation: {currentZone.name}<br />
                    Section: {s.id}<br />
                    Probability: {(s.fault_probability * 100).toFixed(1)}%<br />
                    {activeAlert && `Type: ${faultTypeLabel(activeAlert.fault_type)}`}
                  </div>
                </Popup>
              </Marker>
            )
          })}
        </MapContainer>

        {/* Map legend */}
        <div className="absolute bottom-3 left-3 bg-[#0d1626]/95 border border-white/10 backdrop-blur-sm rounded-xl p-2.5 z-[1000] text-[10px] space-y-1.5">
          {[
            { color: '#22C55E', label: 'Normal Section' },
            { color: '#F59E0B', label: 'Warning Section' },
            { color: '#EF4444', label: 'Critical Fault Node' },
            { color: '#00D4FF', label: 'Selected Feeder Section', dashed: true },
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
