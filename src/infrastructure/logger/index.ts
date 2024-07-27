/**
 * Logger structuré pour les actions sensibles. Émet du JSON sur stdout (pas
 * de dépendance), facile à parser par docker logs → Loki / Promtail /
 * Datadog / CloudWatch / n'importe quel agrégateur.
 *
 * Philosophie : tracer ce qui est critique pour l'audit (création de
 * compte, signalement, candidature, résolution, modération, escalade de
 * rôle), pas ce qui pollue (chaque lecture de page).
 *
 * Usage :
 *   logEvent("report.created", { userId, reportId, type }, { level: "info" });
 *   logEvent("auth.login", { userId }, { level: "info", ip });
 *   logEvent("moderation.resolve", { adminId, action }, { level: "warn" });
 */

export type LogLevel = "debug" | "info" | "warn" | "error";

interface LogOptions {
  level?: LogLevel;
  userId?: string | null;
  ip?: string | null;
  error?: unknown;
}

interface LogPayload {
  ts: string;
  level: LogLevel;
  event: string;
  userId?: string;
  ip?: string;
  data?: Record<string, unknown>;
  error?: string;
}

const MIN_LEVEL = (process.env.LOG_LEVEL ?? "info") as LogLevel;
const LEVELS: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

function shouldLog(level: LogLevel): boolean {
  return LEVELS[level] >= LEVELS[MIN_LEVEL];
}

export function logEvent(
  event: string,
  data: Record<string, unknown> = {},
  opts: LogOptions = {}
) {
  const level = opts.level ?? "info";
  if (!shouldLog(level)) return;

  const payload: LogPayload = {
    ts: new Date().toISOString(),
    level,
    event,
    data: Object.keys(data).length > 0 ? data : undefined,
  };
  if (opts.userId) payload.userId = opts.userId;
  if (opts.ip) payload.ip = opts.ip;
  if (opts.error) {
    payload.error =
      opts.error instanceof Error ? opts.error.message : String(opts.error);
  }

  // Sortie sur stdout (ou stderr pour warn/error, pour que les agrégateurs
  // les classent correctement).
  const line = JSON.stringify(payload);
  if (level === "error" || level === "warn") {
    console.error(line);
  } else {
    console.log(line);
  }
}
