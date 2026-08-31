// One source of truth for the wire format: re-exported from the Worker so the
// client and the Durable Object can never disagree about message shapes.
export * from '../../server/src/protocol.js'
