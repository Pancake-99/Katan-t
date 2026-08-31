/**
 * The lobby wire protocol. Every message is JSON: { type, ...payload }.
 * Kept in one file so the client and the Durable Object can never drift apart.
 */

// Client -> server
export const CLIENT = {
  JOIN: 'join', // { name }
  CHAT: 'chat', // { text }
  LEAVE: 'leave', // {}
}

// Server -> client
export const SERVER = {
  ROSTER: 'roster', // { players: [{ id, name }] }
  CHAT: 'chat', // { id, name, text, at }
  ERROR: 'error', // { message }
}
