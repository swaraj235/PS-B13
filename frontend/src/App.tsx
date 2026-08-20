import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Sidebar } from './components/layout/Sidebar'
import Dashboard  from './pages/Dashboard'
import Analytics  from './pages/Analytics'
import CrewView   from './pages/CrewView'

export default function App() {
  return (
    <BrowserRouter>
      <div className="flex h-screen overflow-hidden bg-navy-900">
        <Sidebar />
        <main className="flex-1 flex flex-col overflow-hidden">
          <Routes>
            <Route path="/"           element={<Dashboard />} />
            <Route path="/analytics"  element={<Analytics />} />
            <Route path="/crew"       element={<CrewView />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  )
}
