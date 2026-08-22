import { useEffect } from 'react'
import { api } from '../lib/api'
import { useGridStore } from '../store/gridStore'

const POLL_INTERVAL = 10_000  // 10s

export function useFaultData() {
  const { _setSections, _setGeoJSON, loadSwitchingGuide, loadComplaints, alerts } = useGridStore()

  useEffect(() => {
    async function poll() {
      try {
        const data = await api.getFaultLocalize()
        _setSections(data.sections)

        const geo = await api.getFaultOverlay()
        _setGeoJSON(geo)

        // Load complaints feed on initial render
        loadComplaints()
      } catch (e) {
        console.error('[useFaultData] poll error', e)
      }
    }

    poll()
    const timer = setInterval(poll, POLL_INTERVAL)
    return () => clearInterval(timer)
  }, [])

  // Load switching guide when a new alert comes in
  useEffect(() => {
    if (alerts.length > 0) {
      loadSwitchingGuide(alerts[0].section_id)
    }
  }, [alerts.length])
}
