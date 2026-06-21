import "server-only";

type LogData = Record<string, unknown>;
type LogLevel = "info" | "warning" | "error";

function writeLog(level: LogLevel, event: string, data: LogData = {}) {
  const payload = JSON.stringify({ level, event, ...data });

  if (level === "error") console.error(payload);
  else if (level === "warning") console.warn(payload);
  else console.log(payload);
}

export function logInfo(event: string, data?: LogData) {
  writeLog("info", event, data);
}

export function logWarning(event: string, data?: LogData) {
  writeLog("warning", event, data);
}

export function logError(event: string, data?: LogData) {
  writeLog("error", event, data);
}

export function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}
