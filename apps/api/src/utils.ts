// ─── In-memory rate limiter voor AI endpoint ──────────────────────────────
const aiRateMap = new Map<string, { count: number; resetAt: number }>()
const AI_RATE_LIMIT = 10 // verzoeken per minuut per gebruiker

export function checkAiRateLimit(userId: string) {
  const now = Date.now()
  const entry = aiRateMap.get(userId)
  if (!entry || now > entry.resetAt) {
    aiRateMap.set(userId, { count: 1, resetAt: now + 60_000 })
    return
  }
  if (entry.count >= AI_RATE_LIMIT) {
    throw new Error('Te veel AI-verzoeken. Probeer het over een minuut opnieuw.')
  }
  entry.count++
}

// ─── Audit logging naar stdout ────────────────────────────────────────────
export function logAudit(event: string, details: Record<string, unknown>) {
  console.log(JSON.stringify({ ts: new Date().toISOString(), event, ...details }))
}
