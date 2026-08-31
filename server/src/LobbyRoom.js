import { CLIENT, SERVER } from './protocol.js'

/**
 * One instance per lobby code. Cloudflare routes every socket for a given code
 * to this same object, so it is a natural single source of truth for the room.
 *
 * Uses the WebSocket Hibernation API: `acceptWebSocket` lets the object be
 * evicted from memory while sockets stay open, and the runtime wakes it on the
 * next message. That is what keeps an idle lobby free to run.
 */
export class LobbyRoom {
  constructor(ctx, env) {
    this.ctx = ctx
    this.env = env
  }

  async fetch(request) {
    if (request.headers.get('Upgrade') !== 'websocket') {
      return new Response('Expected a WebSocket upgrade', { status: 426 })
    }

    const [client, server] = Object.values(new WebSocketPair())
    this.ctx.acceptWebSocket(server)

    // Attachments survive hibernation, so the roster does not need separate
    // storage — each socket carries its own player record.
    server.serializeAttachment({ id: crypto.randomUUID(), name: null })

    return new Response(null, { status: 101, webSocket: client })
  }

  webSocketMessage(ws, raw) {
    let message
    try {
      message = JSON.parse(raw)
    } catch {
      return this.send(ws, { type: SERVER.ERROR, message: 'Malformed message' })
    }

    const player = ws.deserializeAttachment()

    switch (message.type) {
      case CLIENT.JOIN: {
        const name = String(message.name ?? '').trim().slice(0, 24)
        if (!name) {
          return this.send(ws, { type: SERVER.ERROR, message: 'A name is required' })
        }
        ws.serializeAttachment({ ...player, name })
        return this.broadcastRoster()
      }

      case CLIENT.CHAT: {
        if (!player.name) {
          return this.send(ws, { type: SERVER.ERROR, message: 'Join before chatting' })
        }
        const text = String(message.text ?? '').trim().slice(0, 500)
        if (!text) return
        return this.broadcast({
          type: SERVER.CHAT,
          id: player.id,
          name: player.name,
          text,
          at: Date.now(),
        })
      }

      case CLIENT.LEAVE:
        return ws.close(1000, 'Left the lobby')

      default:
        return this.send(ws, { type: SERVER.ERROR, message: `Unknown type: ${message.type}` })
    }
  }

  webSocketClose(ws) {
    this.broadcastRoster(ws)
  }

  webSocketError(ws) {
    this.broadcastRoster(ws)
  }

  /**
   * Everyone who has actually joined (a socket is open before it sends a name).
   * A closing socket is still listed by `getWebSockets()` while its close
   * handler runs, so it has to be excluded explicitly or it lingers on the
   * roster until the next broadcast.
   */
  roster(exclude) {
    return this.ctx
      .getWebSockets()
      .filter((ws) => ws !== exclude)
      .map((ws) => ws.deserializeAttachment())
      .filter((player) => player?.name)
      .map(({ id, name }) => ({ id, name }))
  }

  broadcastRoster(exclude) {
    this.broadcast({ type: SERVER.ROSTER, players: this.roster(exclude) }, exclude)
  }

  broadcast(message, exclude) {
    const payload = JSON.stringify(message)
    for (const ws of this.ctx.getWebSockets()) {
      if (ws === exclude) continue
      try {
        ws.send(payload)
      } catch {
        // Socket died mid-broadcast; the close handler will clean up the roster.
      }
    }
  }

  send(ws, message) {
    ws.send(JSON.stringify(message))
  }
}
