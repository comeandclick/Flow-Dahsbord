const WINDOW_MS = 10 * 60 * 1000;
const LIMIT = 8;
const attempts = new Map();

function now() {
  return Date.now();
}

function cleanup(entry) {
  entry.hits = entry.hits.filter((ts) => now() - ts < WINDOW_MS);
  return entry;
}

export function getClientIp(request) {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }

  return request.headers.get("x-real-ip") || "unknown";
}

export function assertRateLimit(key) {
  const entry = cleanup(attempts.get(key) || { hits: [] });
  if (entry.hits.length >= LIMIT) {
    const retryAfterMs = WINDOW_MS - (now() - entry.hits[0]);
    const error = new Error("Trop de tentatives. Réessayez dans quelques minutes.");
    error.retryAfterMs = retryAfterMs;
    throw error;
  }
  attempts.set(key, entry);
}

export function recordFailure(key) {
  const entry = cleanup(attempts.get(key) || { hits: [] });
  entry.hits.push(now());
  attempts.set(key, entry);
}

export function clearFailures(key) {
  attempts.delete(key);
}
