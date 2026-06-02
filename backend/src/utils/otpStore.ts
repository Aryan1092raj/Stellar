import IORedis from 'ioredis';

const redisUrl = process.env.REDIS_URL;
let redis: IORedis | null = null;
if (redisUrl) redis = new IORedis(redisUrl);

type Entry = { code: string; expiresAt: number };

// Simple in-memory fallback
const memoryStore: Map<string, Entry> = new Map();
const memorySendCounts: Map<string, { count: number; windowStart: number }> = new Map();

export async function storeOtp(email: string, code: string, ttlSeconds: number) {
  const expiresAt = Date.now() + ttlSeconds * 1000;
  if (redis) {
    await redis.set(`otp:${email}`, JSON.stringify({ code, expiresAt }), 'EX', ttlSeconds);
    return;
  }
  memoryStore.set(email, { code, expiresAt });
}

export async function getOtp(email: string): Promise<Entry | null> {
  if (redis) {
    const v = await redis.get(`otp:${email}`);
    if (!v) return null;
    return JSON.parse(v) as Entry;
  }
  const e = memoryStore.get(email) || null;
  return e;
}

export async function deleteOtp(email: string) {
  if (redis) {
    await redis.del(`otp:${email}`);
    return;
  }
  memoryStore.delete(email);
}

// Rate limiting: allow max sendsPerWindow sends per windowSeconds window
export async function incrementSendCount(email: string, sendsPerWindow = 5, windowSeconds = 3600) {
  if (redis) {
    const key = `otp:count:${email}`;
    const tx = redis.multi();
    tx.incr(key);
    tx.ttl(key);
    const res = await tx.exec();
    const cur = Number(res?.[0]?.[1] ?? 0);
    let ttl = Number(res?.[1][1] ?? -1);
    if (ttl === -1) await redis.expire(key, windowSeconds);
    return { allowed: cur <= sendsPerWindow, count: cur };
  }
  const now = Date.now();
  const existing = memorySendCounts.get(email);
  if (!existing || now - existing.windowStart > windowSeconds * 1000) {
    memorySendCounts.set(email, { count: 1, windowStart: now });
    return { allowed: 1 <= sendsPerWindow, count: 1 };
  }
  existing.count += 1;
  memorySendCounts.set(email, existing);
  return { allowed: existing.count <= sendsPerWindow, count: existing.count };
}
