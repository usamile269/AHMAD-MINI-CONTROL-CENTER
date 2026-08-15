'use strict';

const Redis = require('ioredis');
const config = require('../config');

// Redis is optional. The bot remains fully functional with the existing
// in-memory path when REDIS_URL is not configured or when Redis is unavailable.
const REDIS_URL = String(config.REDIS_URL || process.env.REDIS_URL || '').trim();
const REDIS_ENABLED = Boolean(REDIS_URL) && String(config.REDIS_ENABLED ?? 'true') !== 'false';
const STRICT_RATE_LIMIT = String(config.REDIS_STRICT_RATE_LIMIT ?? process.env.REDIS_STRICT_RATE_LIMIT ?? 'false') === 'true';

let client = null;
let redisReady = false;
let redisDisabledUntil = 0;
let lastRedisErrorAt = 0;

function logRedisError(error) {
    const now = Date.now();
    if (now - lastRedisErrorAt < 30000) return;
    lastRedisErrorAt = now;
    console.warn(`[REDIS] ${error?.message || error}`);
}

if (REDIS_ENABLED) {
    try {
        client = new Redis(REDIS_URL, {
            lazyConnect: true,
            maxRetriesPerRequest: 1,
            enableOfflineQueue: false,
            connectTimeout: 1500,
            retryStrategy: (times) => Math.min(times * 250, 5000)
        });
        client.on('ready', () => { redisReady = true; });
        client.on('end', () => { redisReady = false; });
        client.on('error', logRedisError);
        client.connect().catch(logRedisError);
    } catch (error) {
        logRedisError(error);
        client = null;
    }
}

function isRedisConfigured() {
    return REDIS_ENABLED && Boolean(client);
}

function redisUsable() {
    return isRedisConfigured() && redisReady && Date.now() >= redisDisabledUntil;
}

function disableRedisBriefly(error) {
    redisDisabledUntil = Date.now() + 10000;
    redisReady = false;
    logRedisError(error);
}

async function get(key) {
    if (!redisUsable()) return null;
    try { return await client.get(key); } catch (error) { disableRedisBriefly(error); return null; }
}

async function set(key, value, ttlSeconds = 300) {
    if (!redisUsable()) return false;
    try {
        await client.set(key, value, 'EX', Math.max(1, Number(ttlSeconds) || 300));
        return true;
    } catch (error) { disableRedisBriefly(error); return false; }
}

async function del(key) {
    if (!redisUsable()) return false;
    try { await client.del(key); return true; } catch (error) { disableRedisBriefly(error); return false; }
}

// Atomic fixed-window counter. It is intentionally opt-in for strict mode:
// a remote Redis round trip on every message can be slower than the local
// in-memory limiter on a single Railway service. The local limiter remains the
// primary hot path, while this gives multi-instance deployments consistency.
async function consumeWindow(key, windowSeconds, limit) {
    if (!redisUsable()) return { allowed: true, count: 0, remote: false };
    const window = Math.max(1, Number(windowSeconds) || 10);
    const max = Math.max(1, Number(limit) || 6);
    try {
        const redisKey = `ahmad:shield:${key}`;
        const count = await client.incr(redisKey);
        if (count === 1) await client.expire(redisKey, window);
        return { allowed: count <= max, count, remote: true };
    } catch (error) {
        disableRedisBriefly(error);
        return { allowed: true, count: 0, remote: false };
    }
}

function shouldUseStrictRateLimit() { return STRICT_RATE_LIMIT; }

function status() {
    return {
        configured: isRedisConfigured(),
        ready: redisReady,
        strictRateLimit: STRICT_RATE_LIMIT,
        mode: STRICT_RATE_LIMIT ? 'redis-strict' : 'local-fast-path'
    };
}

module.exports = { get, set, del, consumeWindow, isRedisConfigured, shouldUseStrictRateLimit, status };
