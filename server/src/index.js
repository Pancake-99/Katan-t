export { LobbyRoom } from './LobbyRoom.js'

/**
 * Thin router. Its only real job is turning a lobby code into the one Durable
 * Object that owns that lobby, then handing the socket over.
 */
export default {
  async fetch(request, env) {
    const url = new URL(request.url)

    if (url.pathname === '/api/health') {
      return Response.json({ ok: true })
    }

    // /api/lobby/:code/ws
    const lobbyMatch = url.pathname.match(/^\/api\/lobby\/([a-zA-Z0-9-]{1,32})\/ws$/)
    if (lobbyMatch) {
      const code = lobbyMatch[1].toUpperCase()
      const id = env.LOBBY.idFromName(code)
      return env.LOBBY.get(id).fetch(request)
    }

    return new Response('Not found', { status: 404 })
  },
}
