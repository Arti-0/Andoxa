/**
 * Call-session presence helpers.
 *
 * "En cours" is derived, not stored: a session is live only while a teammate
 * is actively present (heartbeat within the freshness window). Past that, it
 * reads as paused — which is how "leaving auto-pauses the session" works
 * without any explicit user action.
 */

/** A heartbeat older than this (ms) means the user has left → paused. */
export const PRESENCE_STALE_MS = 60_000;

/** The four user-facing session states. */
export type SessionLiveStatus = "not_started" | "in_progress" | "paused" | "ended";

export interface PresenceInput {
  /** Raw stored status from `call_sessions.status`. */
  status: string | null | undefined;
  activeHeartbeatAt?: string | null;
  endedAt?: string | null;
  /** Has any prospect been processed yet? Distinguishes not-started vs paused. */
  hasProgress?: boolean;
  now?: number;
}

/**
 * Resolve the effective live status of a session from its stored status +
 * presence heartbeat. Terminal states win; otherwise a fresh heartbeat means
 * in-progress, a stale/absent one means paused (or not-started if untouched).
 */
export function resolveSessionLiveStatus(input: PresenceInput): SessionLiveStatus {
  const now = input.now ?? Date.now();

  if (input.status === "completed" || input.endedAt) return "ended";

  const hb = input.activeHeartbeatAt ? new Date(input.activeHeartbeatAt).getTime() : 0;
  const fresh = hb > 0 && now - hb < PRESENCE_STALE_MS;
  if (fresh) return "in_progress";

  // No live presence. If it was scheduled and nobody has touched it, it's
  // not started yet; otherwise it's a paused in-flight session.
  if (input.status === "scheduled" || input.status === "ready" || input.status === "draft") {
    return input.hasProgress ? "paused" : "not_started";
  }
  return input.hasProgress ? "paused" : "not_started";
}

export const SESSION_LIVE_META: Record<
  SessionLiveStatus,
  { label: string; tone: "blue" | "green" | "amber" | "slate" }
> = {
  not_started: { label: "Prête", tone: "blue" },
  in_progress: { label: "En cours", tone: "green" },
  paused: { label: "En pause", tone: "amber" },
  ended: { label: "Terminée", tone: "slate" },
};
