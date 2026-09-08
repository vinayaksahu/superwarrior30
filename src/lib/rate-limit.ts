// Server-side rate limiter
if (typeof window !== "undefined") {
  throw new Error("Rate limiter cannot be imported on the client side.");
}

interface RateLimitOptions {
  key: string;
  limit: number;
  windowSeconds: number;
}

interface RateLimitResult {
  success: boolean;
  remaining: number;
  reset: number;
}

// In-memory fallback map for environments where Redis is not configured
const inMemoryStore = new Map<string, { count: number; resetAt: number }>();
let hasWarnedMissingRedisInProd = false;

/**
 * Detects whether a rate-limit key protects a high-risk security vector.
 */
export function isSecurityCriticalRateLimitKey(key: string): boolean {
  const normalized = key.toLowerCase();
  return (
    normalized.startsWith("login") ||
    normalized.startsWith("signup") ||
    normalized.startsWith("password_reset") ||
    normalized.startsWith("otp") ||
    normalized.startsWith("mfa") ||
    normalized.startsWith("gw_order_init") ||
    normalized.startsWith("manual_order_init") ||
    normalized.startsWith("withdrawal") ||
    normalized.startsWith("admin")
  );
}

/**
 * Returns current operational rate limiter posture.
 */
export function getRateLimiterStatus(): "DISTRIBUTED" | "CONDITIONAL" | "LOCAL ONLY" {
  const hasRedis = Boolean(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN);
  if (hasRedis) return "DISTRIBUTED";
  if (process.env.NODE_ENV === "production") return "CONDITIONAL";
  return "LOCAL ONLY";
}

/**
 * Serverless-compatible rate limiter.
 * Automatically utilizes Upstash Redis REST API when UPSTASH_REDIS_REST_URL and
 * UPSTASH_REDIS_REST_TOKEN are set; gracefully falls back to memory sliding window.
 */
export async function checkRateLimit({
  key,
  limit,
  windowSeconds,
}: RateLimitOptions): Promise<RateLimitResult> {
  const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
  const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;
  const isProd = process.env.NODE_ENV === "production";

  // 1. Upstash Redis REST API implementation (True Distributed Rate Limiting)
  if (redisUrl && redisToken) {
    try {
      const now = Math.floor(Date.now() / 1000);
      const redisKey = `ratelimit:${key}`;

      // Execute pipeline: INCR and EXPIRE if new
      const pipelineRes = await fetch(`${redisUrl}/pipeline`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${redisToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify([
          ["INCR", redisKey],
          ["EXPIRE", redisKey, windowSeconds, "NX"],
          ["TTL", redisKey],
        ]),
        cache: "no-store",
      });

      if (pipelineRes.ok) {
        const results = await pipelineRes.json();
        const count = results[0]?.result || 1;
        const ttl = results[2]?.result || windowSeconds;

        return {
          success: count <= limit,
          remaining: Math.max(0, limit - count),
          reset: now + ttl,
        };
      }
    } catch (err) {
      console.warn("[RATE LIMITER] Upstash Redis call failed, falling back to local memory store:", err);
    }
  }

  // 2. Production Security Guard: Check if fail-closed is strictly enforced
  if (isProd && (!redisUrl || !redisToken)) {
    if (!hasWarnedMissingRedisInProd) {
      console.warn(
        "[SECURITY NOTICE] Production environment running without UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN. " +
        "Rate limiting is active in per-container memory fallback mode. Configure Upstash Redis for distributed protection across serverless lambdas."
      );
      hasWarnedMissingRedisInProd = true;
    }

    if (process.env.FAIL_CLOSED_WITHOUT_REDIS === "true" && isSecurityCriticalRateLimitKey(key)) {
      console.error(`[SECURITY FAIL-CLOSED] Blocked critical request for key '${key}' because distributed Redis is required.`);
      return {
        success: false,
        remaining: 0,
        reset: Math.floor(Date.now() / 1000) + windowSeconds,
      };
    }
  }

  // 3. In-Memory fallback implementation (for local dev or fallback)
  const now = Date.now();
  const entry = inMemoryStore.get(key);

  if (!entry || now > entry.resetAt) {
    inMemoryStore.set(key, {
      count: 1,
      resetAt: now + windowSeconds * 1000,
    });

    return {
      success: true,
      remaining: limit - 1,
      reset: Math.floor((now + windowSeconds * 1000) / 1000),
    };
  }

  entry.count += 1;
  const isAllowed = entry.count <= limit;

  // Periodic cleanup of expired entries to prevent memory growth
  if (inMemoryStore.size > 5000) {
    for (const [k, v] of inMemoryStore.entries()) {
      if (now > v.resetAt) inMemoryStore.delete(k);
    }
  }

  return {
    success: isAllowed,
    remaining: Math.max(0, limit - entry.count),
    reset: Math.floor(entry.resetAt / 1000),
  };
}
