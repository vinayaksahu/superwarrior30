import "server-only";

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

  // 1. Upstash Redis REST API implementation
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
      console.warn("Upstash rate limit fetch failed, using fallback:", err);
    }
  }

  // 2. In-Memory fallback implementation (for local dev or fallback)
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
