/**
 * Generate a UUID v4 string for client-side record identifiers.
 * Used by offline-first mutation flows to assign stable clientId values
 * before the server confirms a serverId.
 */
export function genId() {
  return crypto.randomUUID()
}

export default genId
