import { useEffect } from 'react'
import { api } from '../lib/api'
import { useGridStore } from '../store/gridStore'

const POLL_INTERVAL = 30_000  // 30s

export function useTerraShield() {
  const { _setTowers } = useGridStore()

  useEffect(() => {
    async function poll() {
      try {
        const data = await api.getTerraShield()
        _setTowers(data.towers)
      } catch (e) {
        console.error('[useTerraShield] poll error', e)
      }
    }

    poll()
    const timer = setInterval(poll, POLL_INTERVAL)
    return () => clearInterval(timer)
  }, [])
}
