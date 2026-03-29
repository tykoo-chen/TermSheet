export interface ArenaMessage {
  role: "user" | "assistant";
  content: string;
  ts: number;
}

export interface ArenaVCSession {
  sharkId: string;
  messages: ArenaMessage[];
  score: number;
  decision: "PENDING" | "ACCEPT" | "REJECT";
  roundNumber: number;
}

export interface ArenaSession {
  sessionId: string;
  vcs: Record<string, ArenaVCSession>;
  createdAt: number;
}

const g = globalThis as typeof globalThis & {
  _arenaSessions?: Map<string, ArenaSession>;
};
if (!g._arenaSessions) g._arenaSessions = new Map();
export const arenaSessions = g._arenaSessions;
