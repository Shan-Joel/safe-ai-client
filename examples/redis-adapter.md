# Redis storage adapter

`safe-ai-client` ships a memory adapter and a small `Storage` interface so you can
plug in Redis (or any key/value store) for distributed limits. Implement these four methods:

```ts
import type { Storage } from "safe-ai-client";
import { Redis } from "ioredis";

export function redisStorage(redis: Redis): Storage {
  return {
    async get(key) {
      const raw = await redis.get(key);
      return raw == null ? undefined : JSON.parse(raw);
    },
    async set(key, value, ttlMs) {
      const payload = JSON.stringify(value);
      if (ttlMs != null) await redis.set(key, payload, "PX", ttlMs);
      else await redis.set(key, payload);
    },
    async increment(key, by, ttlMs) {
      // INCRBYFLOAT is atomic; set TTL only when the key is first created.
      const next = Number(await redis.incrbyfloat(key, by));
      if (ttlMs != null) await redis.pexpire(key, ttlMs, "NX");
      return next;
    },
    async delete(key) {
      await redis.del(key);
    },
  };
}
```

Then:

```ts
import { createGuard } from "safe-ai-client";
import { Redis } from "ioredis";

const guard = createGuard({ storage: redisStorage(new Redis(process.env.REDIS_URL!)) });
```

> **Note:** the built-in sliding-window limiter reads/writes a timestamp array via
> `get`/`set`. For very high throughput, implement a Redis-native limiter using a
> sorted set (`ZADD` / `ZREMRANGEBYSCORE` / `ZCARD`) behind the same `RateLimiter`
> interface exported by the package.
