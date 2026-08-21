import { NavLink, useLocation } from 'react-router-dom'
import { Zap, LayoutDashboard, BarChart3, HardHat, Wifi, WifiOff } from 'lucide-react'
import { useGridStore } from '../../store/gridStore'
import { formatUptime } from '../../lib/utils'

const navItems = [
  { to: '/',          icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/analytics', icon: BarChart3,       label: 'Analytics' },
  { to: '/crew',      icon: HardHat,         label: 'Crew View' },
]

export function Sidebar() {
  const { wsConnected, wsUptime } = useGridStore()

  return (
    <aside className="flex flex-col w-[220px] min-h-screen bg-navy-800 border-r border-white/5 flex-shrink-0">
      {/* Logo */}
      <div className="px-4 py-5 border-b border-white/5">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-electric/20 flex items-center justify-center">
            <Zap className="w-5 h-5 text-electric" />
          </div>
          <div>
            <h1 className="font-head font-bold text-white text-base leading-tight">GridSentinel</h1>
            <p className="text-[10px] text-gray-500 font-mono">POWER GRID MONITOR</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `nav-item ${isActive ? 'active' : ''}`
            }
          >
            <Icon className="w-4 h-4 flex-shrink-0" />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>

      {/* WS Status */}
      <div className="px-4 py-4 border-t border-white/5 space-y-2">
        <div className="flex items-center gap-2">
          {wsConnected ? (
            <>
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-fault-normal opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-fault-normal" />
              </span>
              <Wifi className="w-3.5 h-3.5 text-fault-normal" />
              <span className="text-xs text-fault-normal font-mono font-semibold">CONNECTED</span>
            </>
          ) : (
            <>
              <span className="h-2 w-2 rounded-full bg-gray-600" />
              <WifiOff className="w-3.5 h-3.5 text-gray-500" />
              <span className="text-xs text-gray-500 font-mono">OFFLINE</span>
            </>
          )}
        </div>
        {wsConnected && (
          <p className="text-[11px] text-gray-500 font-mono pl-5">
            UP {formatUptime(wsUptime)}
          </p>
        )}
        <div className="mt-1">
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-electric/10 text-electric border border-electric/20">
            MOCK MODE
          </span>
        </div>
      </div>
    </aside>
  )
}
