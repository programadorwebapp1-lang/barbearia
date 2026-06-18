type RateLimitOptions = {
  limit: number;
  windowMs: number;
};

type Bucket = {
  count: number;
  resetAt: number;
};

declare global {
  // eslint-disable-next-line no-var
  var rateLimitBuckets: Map<string, Bucket> | undefined;
}

const buckets = globalThis.rateLimitBuckets ?? new Map<string, Bucket>();
globalThis.rateLimitBuckets = buckets;

function cleanupExpired(now: number) {
  for (const [key, bucket] of buckets.entries()) {
    if (bucket.resetAt <= now) {
      buckets.delete(key);
    }
  }
}

export function getRequestFingerprint(headers: Headers) {
  const forwardedFor = headers.get("x-forwarded-for") || "";
  const realIp = headers.get("x-real-ip") || "";
  const ip = forwardedFor.split(",")[0]?.trim() || realIp.trim() || "unknown";
  return ip;
}

export function checkRateLimit(scope: string, fingerprint: string, options: RateLimitOptions) {
  const now = Date.now();
  cleanupExpired(now);

  const key = `${scope}:${fingerprint}`;
  const current = buckets.get(key);

  if (!current || current.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + options.windowMs });
    return { allowed: true as const, remaining: options.limit - 1, resetAt: now + options.windowMs };
  }

  if (current.count >= options.limit) {
    return { allowed: false as const, remaining: 0, resetAt: current.resetAt };
  }

  current.count += 1;
  buckets.set(key, current);
  return { allowed: true as const, remaining: Math.max(0, options.limit - current.count), resetAt: current.resetAt };
}

