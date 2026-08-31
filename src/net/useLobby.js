import { useCallback, useEffect, useRef, useState } from 'react'
import { CLIENT, SERVER } from './protocol.js'

/**
 * Connects to a lobby's Durable Object and keeps the roster and chat log in
 * sync. Deliberately dumb for now: it holds no game state, it only relays.
 */
export function useLobby(code, name) {
  const socketRef = useRef(null)
  const [status, setStatus] = useState('connecting')
  const [players, setPlayers] = useState([])
  const [messages, setMessages] = useState([])

  useEffect(() => {
    if (!code || !name) return

    const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws'
    const socket = new WebSocket(`${protocol}://${window.location.host}/api/lobby/${code}/ws`)
    socketRef.current = socket

    socket.addEventListener('open', () => {
      setStatus('connected')
      socket.send(JSON.stringify({ type: CLIENT.JOIN, name }))
    })

    socket.addEventListener('message', (event) => {
      const message = JSON.parse(event.data)
      switch (message.type) {
        case SERVER.ROSTER:
          return setPlayers(message.players)
        case SERVER.CHAT:
          return setMessages((prev) => [...prev, message])
        case SERVER.ERROR:
          return console.warn('[lobby]', message.message)
        default:
          return console.warn('[lobby] unhandled message', message)
      }
    })

    socket.addEventListener('close', () => setStatus('disconnected'))
    socket.addEventListener('error', () => setStatus('error'))

    return () => socket.close()
  }, [code, name])

  const sendChat = useCallback((text) => {
    socketRef.current?.send(JSON.stringify({ type: CLIENT.CHAT, text }))
  }, [])

  return { status, players, messages, sendChat }
}
