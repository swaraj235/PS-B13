import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Outlet } from 'react-router-dom'
import { Sidebar } from './components/layout/Sidebar'
import Dashboard  from './pages/Dashboard'
import Analytics  from './pages/Analytics'
import CrewView   from './pages/CrewView'
import { AuditLogView } from './pages/AuditLogView'
import { Login } from './pages/Login'
import { Signup } from './pages/Signup'
import { ConsumerLayout } from './components/layout/ConsumerLayout'
import { ConsumerDashboard } from './pages/consumer/ConsumerDashboard'
import { ConsumerReportOutage } from './pages/consumer/ConsumerReportOutage'
import { ConsumerMyTickets } from './pages/consumer/ConsumerMyTickets'
import { ConsumerProfile } from './pages/consumer/ConsumerProfile'
import { ProtectedRoute } from './components/auth/ProtectedRoute'
import { useAuthStore } from './store/authStore'

function AdminLayout() {
  return (
    <div className="flex h-screen overflow-hidden bg-navy-900">
      <Sidebar />
      <main className="flex-1 flex flex-col overflow-hidden">
        <Outlet />
      </main>
    </div>
  )
}

export default function App() {
  const initAuth = useAuthStore(state => state.initAuth)

  useEffect(() => {
    initAuth()
  }, [])

  return (
    <BrowserRouter>
      <Routes>
        {/* Public Auth Routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />

        {/* Multi-Page Consumer Portal Routes */}
        <Route
          path="/consumer"
          element={
            <ProtectedRoute requiredRole="consumer">
              <ConsumerLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<ConsumerDashboard />} />
          <Route path="report" element={<ConsumerReportOutage />} />
          <Route path="tickets" element={<ConsumerMyTickets />} />
          <Route path="profile" element={<ConsumerProfile />} />
        </Route>

        {/* Protected Utility Admin Portal Routes */}
        <Route
          element={
            <ProtectedRoute requiredRole="admin">
              <AdminLayout />
            </ProtectedRoute>
          }
        >
          <Route path="/"          element={<Dashboard />} />
          <Route path="/audit-logs" element={<AuditLogView />} />
          <Route path="/analytics" element={<Analytics />} />
          <Route path="/crew"      element={<CrewView />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
