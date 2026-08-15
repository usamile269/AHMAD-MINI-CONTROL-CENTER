const redis = require('../lib/redis-cache');

(async () => {
  const result = await redis.consumeWindow('test-group:test-user', 10, 6);
  const status = redis.status();
  if (!result.allowed) throw new Error('Redis-disabled fallback unexpectedly blocked a message');
  if (status.configured) throw new Error('This smoke test expects REDIS_URL to be unset');
  console.log(JSON.stringify({ ok: true, result, status }));
})().catch((error) => {
  console.error(error?.stack || error);
  process.exit(1);
});
