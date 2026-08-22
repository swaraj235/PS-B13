import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Zap, UserCheck, ShieldCheck, Mail, Lock, User, Phone, MapPin, AlertCircle, ArrowRight } from 'lucide-react'
import { api } from '../lib/api'
import { useAuthStore } from '../store/authStore'
import { PUNE_FEEDER_ZONES } from '../components/map/FeederMap'

export function Signup() {
  const navigate = useNavigate()
  const setAuth = useAuthStore(state => state.setAuth)

  const [fullName, setFullName] = useState('')
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [phone, setPhone]       = useState('')
  const [role, setRole]         = useState<'consumer' | 'admin'>('consumer')
  const [zoneId, setZoneId]     = useState(1)
  const [error, setError]       = useState<string | null>(null)
  const [loading, setLoading]   = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const res = await api.signup({
        full_name: fullName,
        email,
        password,
        phone,
        role,
        zone_id: zoneId,
      })
      setAuth(res.user, res.access_token)
      if (res.user.role === 'admin') {
        navigate('/')
      } else {
        navigate('/consumer')
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Signup failed'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#070d18] text-gray-100 flex items-center justify-center p-4">
      {/* Background Glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-electric/10 rounded-full blur-[140px] pointer-events-none" />

      <div className="w-full max-w-md bg-[#0d1626]/90 border border-electric/20 backdrop-blur-xl rounded-2xl shadow-2xl p-8 relative z-10">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-electric/10 border border-electric/30 text-electric text-xs font-bold mb-3">
            <Zap className="w-4 h-4 text-electric animate-pulse" />
            GridSentinel
          </div>
          <h1 className="text-2xl font-black text-white tracking-wide">
            Create Account
          </h1>
          <p className="text-xs text-gray-400 mt-1">
            Register for Pune Feeder Outage Alerts & Utility Management
          </p>
        </div>

        {/* Role Toggle */}
        <div className="flex bg-[#050b14] p-1 rounded-xl border border-white/10 mb-5">
          <button
            type="button"
            onClick={() => setRole('consumer')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-bold rounded-lg transition-all ${
              role === 'consumer' ? 'bg-electric text-[#070d18] shadow-md' : 'text-gray-400 hover:text-white'
            }`}
          >
            <UserCheck className="w-3.5 h-3.5" />
            Electricity Consumer
          </button>
          <button
            type="button"
            onClick={() => setRole('admin')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-bold rounded-lg transition-all ${
              role === 'admin' ? 'bg-electric text-[#070d18] shadow-md' : 'text-gray-400 hover:text-white'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            MSEDCL Staff
          </button>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div>
            <label className="block text-[11px] font-semibold text-gray-300 uppercase tracking-wider mb-1">
              Full Name
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                required
                value={fullName}
                onChange={e => setFullName(e.target.value)}
                placeholder="e.g. Rajesh Kumar"
                className="w-full pl-9 pr-4 py-2 bg-[#050b14] border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-electric transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-gray-300 uppercase tracking-wider mb-1">
              Email Address
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="rajesh@pune.in"
                className="w-full pl-9 pr-4 py-2 bg-[#050b14] border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-electric transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-gray-300 uppercase tracking-wider mb-1">
              Password (Min 6 chars)
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-9 pr-4 py-2 bg-[#050b14] border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-electric transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-gray-300 uppercase tracking-wider mb-1">
              Phone Number
            </label>
            <div className="relative">
              <Phone className="w-4 h-4 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="tel"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                placeholder="+91 98765 43210"
                className="w-full pl-9 pr-4 py-2 bg-[#050b14] border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-electric transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-gray-300 uppercase tracking-wider mb-1">
              Primary Feeder Zone
            </label>
            <div className="relative">
              <MapPin className="w-4 h-4 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <select
                value={zoneId}
                onChange={e => setZoneId(Number(e.target.value))}
                className="w-full pl-9 pr-4 py-2 bg-[#050b14] border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-electric cursor-pointer"
              >
                {Object.values(PUNE_FEEDER_ZONES).map(zone => (
                  <option key={zone.id} value={zone.id} className="bg-[#050b14]">
                    📍 {zone.name} ({zone.area})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-electric hover:bg-electric/90 text-[#070d18] font-bold text-xs rounded-xl shadow-lg shadow-electric/20 flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50 mt-4"
          >
            {loading ? (
              <span>Registering Account...</span>
            ) : (
              <>
                <span>Complete Registration</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Login Link */}
        <div className="mt-6 text-center text-xs text-gray-400">
          Already have an account?{' '}
          <Link to="/login" className="text-electric hover:underline font-bold">
            Sign In
          </Link>
        </div>
      </div>
    </div>
  )
}
