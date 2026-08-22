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

// ── Substation Zone Definitions for Pune Circle ────────────────────────────────
export interface FeederZoneDef {
  id: number
  name: string
  area: string
  voltage: string
  consumers: string
  center: [number, number]
  zoom: number
  lineCoords: [number, number][]
  midpoint: [number, number]
}

export const PUNE_FEEDER_ZONES: Record<number, FeederZoneDef> = {
  1: {
    id: 1,
    name: 'Zone 1: Kothrud Substation',
    area: 'Kothrud Central, Karve Nagar & Warje',
    voltage: '11kV Feeder',
    consumers: '62,000',
    center: [18.507, 73.805],
    zoom: 14,
    lineCoords: [
      [18.501, 73.800],
      [18.508, 73.810],
      [18.514, 73.818],
      [18.495, 73.812],
    ],
    midpoint: [18.504, 73.805],
  },
  2: {
    id: 2,
    name: 'Zone 2: Paud Road Substation',
    area: 'Paud Road, Ideal Colony & Bavdhan',
    voltage: '11kV Feeder',
    consumers: '45,000',
    center: [18.522, 73.830],
    zoom: 14,
    lineCoords: [
      [18.514, 73.818],
      [18.522, 73.830],
      [18.528, 73.840],
      [18.535, 73.848],
    ],
    midpoint: [18.525, 73.835],
  },
  3: {
    id: 3,
    name: 'Zone 3: Kondhwa Substation',
    area: 'Kondhwa Budruk, Undri & NIBM Rd',
    voltage: '22kV / 11kV Feeder',
    consumers: '48,500',
    center: [18.468, 73.890],
    zoom: 14,
    lineCoords: [
      [18.464, 73.885],
      [18.472, 73.892],
      [18.478, 73.899],
      [18.465, 73.908],
    ],
    midpoint: [18.471, 73.895],
  },
  4: {
    id: 4,
    name: 'Zone 4: Hadapsar Substation',
    area: 'Hadapsar & Magarpatta Industrial',
    voltage: '22kV Feeder',
    consumers: '74,000',
    center: [18.508, 73.926],
    zoom: 14,
    lineCoords: [
      [18.502, 73.920],
      [18.512, 73.928],
      [18.520, 73.935],
      [18.528, 73.945],
    ],
    midpoint: [18.516, 73.931],
  },
  5: {
    id: 5,
    name: 'Zone 5: Swargate Substation',
    area: 'Swargate Terminal & Camp Market',
    voltage: '11kV Feeder',
    consumers: '58,000',
    center: [18.501, 73.858],
    zoom: 14,
    lineCoords: [
      [18.498, 73.855],
      [18.505, 73.865],
      [18.515, 73.875],
      [18.525, 73.865],
    ],
    midpoint: [18.510, 73.865],
  },
}

// Overview option for showing full Pune Circle
const PUNE_OVERVIEW = {
  center: [18.505, 73.860] as [number, number],
  zoom: 12,
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
      map.flyTo(center, zoom, { duration: 1.2, easeLinearity: 0.3 })
      prevCenter.current = center
    }
  }, [center, zoom, map])
  return null
}

interface FeederMapProps {
  restrictedZoneId?: number
}

// ── Main component ────────────────────────────────────────────────────────────
export function FeederMap({ restrictedZoneId }: FeederMapProps = {}) {
  const { sections, activeAlert, selectedSectionId, setSelectedSectionId } = useGridStore()

  const activeZoneId  = restrictedZoneId ?? selectedSectionId
  const selectedZone  = PUNE_FEEDER_ZONES[activeZoneId] ?? PUNE_FEEDER_ZONES[3]
  const [isOverview, setIsOverview] = useState(false)

  const mapCenter = (isOverview && !restrictedZoneId) ? PUNE_OVERVIEW.center : selectedZone.center
  const mapZoom   = (isOverview && !restrictedZoneId) ? PUNE_OVERVIEW.zoom   : selectedZone.zoom

  const sectionStatus: Record<number, SectionStatus> = {}
  sections.forEach(s => { sectionStatus[s.id] = s.status })

  return (
    <div className="card flex flex-col gap-4">
      {/* Header with Substation Zone Dropdown */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <div className="card-header mb-0">
            <span className="text-electric">⚡</span>
            Feeder Map — {restrictedZoneId ? `${selectedZone.name} GIS` : 'Pune Circle GIS'}
            {activeAlert && activeAlert.section_id === activeZoneId && (
              <span className="ml-3 px-2.5 py-0.5 rounded-full bg-red-500/20 border border-red-500/40 text-red-400 text-xs font-bold animate-pulse">
                ⚠ FAULT ALERT: ZONE {activeAlert.section_id}
              </span>
            )}
          </div>
          <p className="text-[11px] text-gray-400 flex items-center gap-1 mt-0.5 font-medium">
            <Layers className="w-3 h-3 text-electric" />
            {isOverview && !restrictedZoneId 
              ? 'Pune Metropolitan Circle (5 Main Feeder Corridors)' 
              : `${selectedZone.name} — ${selectedZone.area} (${selectedZone.consumers} consumers)`}
          </p>
        </div>

        {/* Substation Zone Selector / Readonly Pill */}
        <div className="flex items-center gap-2">
          {restrictedZoneId ? (
            <div className="flex items-center gap-2 bg-[#0a1525] border border-electric/40 text-electric rounded-xl px-3 py-1.5 font-bold text-xs">
              <Zap className="w-3.5 h-3.5" />
              <span>📍 Your Zone: {selectedZone.name}</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 bg-[#0a1525] border border-electric/30 rounded-xl px-3 py-1.5">
              <Zap className="w-3.5 h-3.5 text-electric" />
              <select
                value={isOverview ? 'overview' : selectedSectionId}
                onChange={e => {
                  const val = e.target.value
                  if (val === 'overview') {
                    setIsOverview(true)
                  } else {
                    setIsOverview(false)
                    setSelectedSectionId(Number(val))
                  }
                }}
                className="bg-transparent text-xs font-bold text-white focus:outline-none cursor-pointer"
              >
                <option value="overview" className="bg-[#0a1525] text-white">
                  🌐 Entire Pune Grid Overview
                </option>
                {Object.values(PUNE_FEEDER_ZONES).map(zone => (
                  <option key={zone.id} value={zone.id} className="bg-[#0a1525] text-white">
                    📍 {zone.name}
                  </option>
                ))}
              </select>
            </div>
          )}
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

          {/* Feeder section lines (restricted to consumer zone if restrictedZoneId set) */}
          {(restrictedZoneId 
            ? Object.values(PUNE_FEEDER_ZONES).filter(z => z.id === restrictedZoneId)
            : Object.values(PUNE_FEEDER_ZONES)
          ).map(zone => {
            const secId    = zone.id
            const status   = sectionStatus[secId] ?? 'normal'
            const color    = STATUS_COLORS[status]
            const isCrit   = status === 'critical'
            const isSel    = secId === activeZoneId

            return (
              <Polyline
                key={`pune-zone-${secId}`}
                positions={zone.lineCoords}
                eventHandlers={{
                  click: () => {
                    if (!restrictedZoneId) {
                      setIsOverview(false)
                      setSelectedSectionId(secId)
                    }
                  }
                }}
                pathOptions={{
                  color:   isSel ? '#00D4FF' : color,
                  weight:  isCrit ? 8 : isSel ? 7 : 5,
                  opacity: isCrit || isSel ? 1 : 0.75,
                }}
              >
                <Tooltip direction="top" permanent={isSel}>
                  <span style={{ fontFamily: 'monospace', fontSize: '11px', fontWeight: 700 }}>
                    {zone.name} — {status.toUpperCase()}
                  </span>
                </Tooltip>
              </Polyline>
            )
          })}

          {/* Critical fault markers */}
          {(restrictedZoneId
            ? sections.filter(s => s.status === 'critical' && s.id === restrictedZoneId)
            : sections.filter(s => s.status === 'critical')
          ).map(s => {
            const zone = PUNE_FEEDER_ZONES[s.id]
            if (!zone) return null

            return (
              <Marker
                key={`fault-marker-${s.id}`}
                position={zone.midpoint}
                icon={faultIcon('#EF4444')}
                eventHandlers={{
                  click: () => {
                    if (!restrictedZoneId) {
                      setIsOverview(false)
                      setSelectedSectionId(s.id)
                    }
                  }
                }}
              >
                <Popup>
                  <div style={{ fontFamily: 'monospace', minWidth: '220px', padding: '4px' }}>
                    <strong style={{ color: '#EF4444', fontSize: '12px' }}>🚨 CRITICAL FAULT PINPOINTED</strong><br />
                    <span style={{ color: '#00D4FF', fontWeight: 'bold' }}>{zone.name}</span><br />
                    <span style={{ color: '#94A3B8' }}>Area: {zone.area}</span><br />
                    <hr style={{ borderColor: 'rgba(255,255,255,0.1)', margin: '4px 0' }} />
                    <strong style={{ color: '#F59E0B' }}>📍 Tower: {zone.id === 1 ? 'Tower #T1-04' : zone.id === 2 ? 'Tower #T2-06' : zone.id === 3 ? 'Tower #T3-09' : zone.id === 4 ? 'Tower #T4-12' : 'Tower #T5-03'}</strong><br />
                    <span style={{ color: '#22C55E' }}>📡 GPS: {zone.midpoint[0]}° N, {zone.midpoint[1]}° E</span><br />
                    <span style={{ color: '#CBD5E1' }}>📏 Distance: {zone.id === 1 ? '1.15 km' : zone.id === 2 ? '2.12 km' : zone.id === 3 ? '3.45 km' : zone.id === 4 ? '5.10 km' : '6.85 km'} from Substation</span><br />
                    <span style={{ color: '#EF4444' }}>Risk Confidence: {(s.fault_probability * 100).toFixed(1)}%</span>
                  </div>
                </Popup>
              </Marker>
            )
          })}
        </MapContainer>

        {/* Map legend */}
        <div className="absolute bottom-3 left-3 bg-[#0d1626]/95 border border-white/10 backdrop-blur-sm rounded-xl p-2.5 z-[1000] text-[10px] space-y-1.5">
          {[
            { color: '#22C55E', label: 'Normal Zone Feeder' },
            { color: '#F59E0B', label: 'Warning Feeder' },
            { color: '#EF4444', label: 'Critical Fault Zone' },
            { color: '#00D4FF', label: 'Selected Feeder Corridor', dashed: true },
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
