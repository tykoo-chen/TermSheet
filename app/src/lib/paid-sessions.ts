// Server-side store: paid pitch sessions (in-memory, survives hot reload via globalThis)
// Replace with Redis/DB in production for persistence across instances.
const g = globalThis as Record<string, unknown>;
export const paidPitchSessions: Map<string, { sharkId: string; paidAt: number; checkoutId: string }> =
  (g.__paidPitchSessions as Map<string, { sharkId: string; paidAt: number; checkoutId: string }>) ??
  (g.__paidPitchSessions = new Map());
