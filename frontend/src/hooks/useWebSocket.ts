import { useEffect, useRef } from 'react'
import { WS_BASE } from '../lib/constants'
import { useGridStore } from '../store/gridStore'
import type { WSMessage, SensorReading, ClassifyResponse } from '../types'

export function useWebSocket() {
  const wsRef = useRef<WebSocket | null>(null)
  const { _addSensorReading, _addAlert, _setConnected, _setUptime } = useGridStore()

  useEffect(() => {
    let reconnectTimer: ReturnType<typeof setTimeout>

    function connect() {
      try {
        const ws = new WebSocket(`${WS_BASE}/api/ws/live`)
        wsRef.current = ws

        ws.onopen = () => {
          _setConnected(true)
          console.log('[WS] Connected')
        }

        ws.onmessage = (event) => {
          try {
            const msg: WSMessage = JSON.parse(event.data)
            if (msg.type === 'sensor_reading' && msg.data) {
              _addSensorReading(msg.data as SensorReading)
            } else if (msg.type === 'fault_alert' && msg.data) {
              _addAlert(msg.data as ClassifyResponse)
            } else if (msg.type === 'heartbeat') {
              _setUptime(msg.uptime_sec ?? 0)
            }
          } catch (e) {
            console.error('[WS] Parse error', e)
          }
        }

        ws.onerror = () => {
          _setConnected(false)
        }

        ws.onclose = () => {
          _setConnected(false)
          console.log('[WS] Disconnected — reconnecting in 3s')
          reconnectTimer = setTimeout(connect, 3000)
        }
      } catch (e) {
        _setConnected(false)
        reconnectTimer = setTimeout(connect, 3000)
      }
    }

    connect()

    return () => {
      clearTimeout(reconnectTimer)
      wsRef.current?.close()
    }
  }, [])
}
