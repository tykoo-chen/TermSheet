// Server-side pitch credit store (in-memory, globalThis pattern for hot-reload survival)
// Replace with Redis/DB in production for persistence across instances.

export interface PitchAccount {
  token: string;
  credits: number;
  walletAddress?: string;
  createdAt: number;
  usedCredits: number;
  stripeSessionId?: string;
  status: "pending" | "active";
}

const g = globalThis as Record<string, unknown>;
export const pitchAccounts: Map<string, PitchAccount> =
  (g.__pitchAccounts as Map<string, PitchAccount>) ??
  (g.__pitchAccounts = new Map());

/** Generate a random pitch token */
export function generatePitchToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(20));
  return "pt_" + Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** Validate a token and deduct a credit. Returns the account or null. */
export function consumeCredit(token: string): PitchAccount | null {
  const account = pitchAccounts.get(token);
  if (!account) return null;
  if (account.status !== "active") return null;
  if (account.credits <= 0) return null;
  account.credits -= 1;
  account.usedCredits += 1;
  return account;
}

/** Peek at an account without consuming (for balance checks). */
export function getAccount(token: string): PitchAccount | null {
  return pitchAccounts.get(token) ?? null;
}
