import { NavLink, useNavigate } from 'react-router-dom'
import { 
  Zap, LayoutDashboard, Send, Clock, User as UserIcon, LogOut, ShieldCheck, PhoneCall, Wifi, WifiOff, MapPin
} from 'lucide-react'
import { useAuthStore } from '../../store/authStore'
import { useGridStore } from '../../store/gridStore'
import { PUNE_FEEDER_ZONES } from '../map/FeederMap'
import { formatUptime } from '../../lib/utils'

const navItems = [
  { to: '/consumer',          icon: LayoutDashboard, label: 'Dashboard',    desc: 'Live grid overview', exact: true },
  { to: '/consumer/report',   icon: Send,            label: 'Report Outage',desc: 'Register fault ticket' },
  { to: '/consumer/tickets',  icon: Clock,           label: 'My Tickets',   desc: 'Resolution stepper' },
  { to: '/consumer/profile',  icon: UserIcon,        label: 'My Profile',   desc: 'Substation & photo' },
]

export function ConsumerSidebar() {
  const navigate = useNavigate()
  const { wsConnected, wsUptime } = useGridStore()
  const { user, logout } = useAuthStore()

  const registeredZone = PUNE_FEEDER_ZONES[user?.zone_id || 1] || PUNE_FEEDER_ZONES[1]

  return (
    <aside className="flex flex-col w-[240px] min-h-screen bg-[#0a1120] border-r border-white/10 flex-shrink-0">

      {/* ── Logo ───────────────────────────────────── */}
      <div className="px-5 py-6 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-electric/20 border border-electric/30 flex items-center justify-center flex-shrink-0">
            <Zap className="w-6 h-6 text-electric" />
          </div>
          <div>
            <h1 className="font-bold text-white text-lg leading-tight tracking-tight">GridSentinel</h1>
            <p className="text-[10px] text-electric font-mono tracking-widest font-bold mt-0.5 uppercase">CONSUMER PORTAL</p>
          </div>
        </div>
      </div>

      {/* ── Navigation ─────────────────────────────── */}
      <nav className="flex-1 px-3 py-5 space-y-1">
        <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest px-3 mb-3">Consumer Menu</p>
        {navItems.map(({ to, icon: Icon, label, desc, exact }) => (
          <NavLink
            key={to}
            to={to}
            end={exact}
            className={({ isActive }: { isActive: boolean }) =>
              `nav-item group ${isActive ? 'active' : ''}`
            }
          >
            <Icon className="w-5 h-5 flex-shrink-0" />
            <div className="flex flex-col leading-tight">
              <span className="text-sm">{label}</span>
              <span className="text-[10px] text-gray-500 group-hover:text-gray-400">{desc}</span>
            </div>
          </NavLink>
        ))}
      </nav>

      {/* ── Emergency Hotline Pill ────────────────────── */}
      <div className="px-4 mb-3">
        <a
          href="tel:1912"
          className="w-full py-2.5 px-3 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-400 text-xs font-bold rounded-xl flex items-center justify-center gap-2 transition-all shadow-md"
        >
          <PhoneCall className="w-4 h-4" />
          <span>Toll-Free 1912 Helpline</span>
        </a>
      </div>

      {/* ── User Profile & Feeder Zone ───────────────────────── */}
      <div className="px-4 pb-5 space-y-3">
        {user ? (
          <div className="p-3 rounded-xl bg-[#050b14] border border-white/10 space-y-2">
            <div className="flex items-center gap-2.5">
              {user.avatar_data ? (
                <img src={user.avatar_data} alt="Avatar" className="w-8 h-8 rounded-lg object-cover border border-electric/40" />
              ) : (
                <div className="w-8 h-8 rounded-lg bg-electric/10 border border-electric/30 flex items-center justify-center text-electric">
                  <UserIcon className="w-4 h-4" />
                </div>
              )}
              <div className="truncate flex-1">
                <span className="text-xs font-bold text-white block truncate">{user.full_name || 'Resident'}</span>
                <span className="text-[10px] text-gray-400 block truncate">{user.email}</span>
              </div>
            </div>

            <div className="flex items-center gap-1.5 pt-1 text-[10px] text-gray-300 font-mono bg-white/5 p-1.5 rounded-lg border border-white/5">
              <MapPin className="w-3 h-3 text-electric flex-shrink-0" />
              <span className="truncate">{registeredZone.name}</span>
            </div>

            {user.role === 'admin' && (
              <button
                onClick={() => navigate('/')}
                className="w-full py-1.5 bg-electric/15 hover:bg-electric/25 border border-electric/40 text-electric rounded-lg text-[10px] font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                Switch to Admin Portal
              </button>
            )}

            <button
              onClick={() => { logout(); navigate('/login') }}
              className="w-full py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 rounded-lg text-[10px] font-bold flex items-center justify-center gap-1 transition-all cursor-pointer"
            >
              <LogOut className="w-3 h-3" />
              Sign Out
            </button>
          </div>
        ) : (
          <button
            onClick={() => navigate('/login')}
            className="w-full py-2 bg-electric text-[#070d18] font-bold text-xs rounded-xl shadow transition-all cursor-pointer"
          >
            Sign In / Register
          </button>
        )}

        {/* Live Grid WS Status */}
        <div className={`flex items-center gap-3 p-2.5 rounded-xl border ${
          wsConnected
            ? 'bg-green-500/10 border-green-500/25'
            : 'bg-gray-500/10 border-gray-500/20'
        }`}>
          {wsConnected ? (
            <>
              <span className="relative flex h-2 w-2 flex-shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-400" />
              </span>
              <div>
                <p className="text-[11px] font-bold text-green-400 leading-tight">LIVE TELEMETRY</p>
                {wsUptime > 0 && (
                  <p className="text-[9px] text-gray-400 font-mono">Up {formatUptime(wsUptime)}</p>
                )}
              </div>
              <Wifi className="w-3.5 h-3.5 text-green-400 ml-auto" />
            </>
          ) : (
            <>
              <span className="h-2 w-2 rounded-full bg-gray-500 flex-shrink-0" />
              <div>
                <p className="text-[11px] font-bold text-gray-400 leading-tight">OFFLINE</p>
              </div>
              <WifiOff className="w-3.5 h-3.5 text-gray-500 ml-auto" />
            </>
          )}
        </div>
      </div>
    </aside>
  )
}
