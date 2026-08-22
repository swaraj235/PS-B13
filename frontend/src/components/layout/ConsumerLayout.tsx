import { Outlet } from 'react-router-dom'
import { ConsumerSidebar } from './ConsumerSidebar'

export function ConsumerLayout() {
  return (
    <div className="flex h-screen overflow-hidden bg-[#050b14] text-gray-100">
      {/* ── Left Sidebar Navigation ── */}
      <ConsumerSidebar />

      {/* ── Full-Width Main Content Body ── */}
      <main className="flex-1 flex flex-col overflow-y-auto min-w-0 bg-[#050b14] p-4 md:p-6 space-y-6">
        <Outlet />
      </main>
    </div>
  )
}
