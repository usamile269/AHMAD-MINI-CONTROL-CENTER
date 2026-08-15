'use strict';

// ============================================================================
// lib/queue.js — local concurrency queue plus optional distributed BullMQ.
//
// The local queue remains the default so the existing bot behavior is safe on
// Railway without Redis. When DISTRIBUTED_QUEUE_ENABLED=true and REDIS_URL is
// configured, JSON-serializable heavy jobs can be handed to independent worker
// processes. Functions are deliberately never serialized into Redis.
// ============================================================================

class HeavyQueue {
    constructor(maxConcurrent = 4) {
        this.maxConcurrent = maxConcurrent;
        this.running = 0;
        this.waiting = [];
    }

    queuePosition() {
        return this.waiting.length + Math.max(0, this.running - this.maxConcurrent);
    }

    async run(fn, onQueued) {
        if (this.running >= this.maxConcurrent) {
            const position = this.waiting.length + 1;
            if (onQueued) { try { onQueued(position); } catch {} }
            await new Promise(resolve => this.waiting.push(resolve));
        }
        this.running++;
        try {
            return await fn();
        } finally {
            this.running--;
            const next = this.waiting.shift();
            if (next) next();
        }
    }
}

const configuredConcurrency = Number.parseInt(process.env.HEAVY_DOWNLOAD_CONCURRENCY, 10);
const heavyConcurrency = Number.isFinite(configuredConcurrency)
    ? Math.max(1, Math.min(configuredConcurrency, 3))
    : 2;
const heavyQueue = new HeavyQueue(heavyConcurrency);

const QUEUE_NAME = process.env.MEDIA_QUEUE_NAME || 'ahmad-mini-media-v1';
const distributedEnabled = String(process.env.DISTRIBUTED_QUEUE_ENABLED || 'false').toLowerCase() === 'true';
let distributedQueue = null;
let queueEvents = null;
let queueLoadError = null;

function buildRedisConnection() {
    const raw = String(process.env.REDIS_URL || '').trim();
    if (!raw) return null;
    try {
        const parsed = new URL(raw);
        const connection = {
            host: parsed.hostname,
            port: Number(parsed.port) || (parsed.protocol === 'rediss:' ? 6380 : 6379),
            maxRetriesPerRequest: null,
            enableReadyCheck: false
        };
        if (parsed.username) connection.username = decodeURIComponent(parsed.username);
        if (parsed.password) connection.password = decodeURIComponent(parsed.password);
        if (parsed.pathname && parsed.pathname !== '/') {
            const db = Number.parseInt(parsed.pathname.slice(1), 10);
            if (Number.isInteger(db)) connection.db = db;
        }
        if (parsed.protocol === 'rediss:') connection.tls = {};
        return connection;
    } catch (error) {
        queueLoadError = `Invalid REDIS_URL: ${error.message}`;
        return null;
    }
}

function getDistributedQueue() {
    if (!distributedEnabled) return null;
    if (distributedQueue) return distributedQueue;
    const connection = buildRedisConnection();
    if (!connection) return null;
    try {
        const { Queue, QueueEvents } = require('bullmq');
        distributedQueue = new Queue(QUEUE_NAME, {
            connection,
            defaultJobOptions: {
                attempts: 2,
                backoff: { type: 'exponential', delay: 2500 },
                removeOnComplete: { count: 100 },
                removeOnFail: { count: 200 }
            }
        });
        queueEvents = new QueueEvents(QUEUE_NAME, { connection });
        queueLoadError = null;
        return distributedQueue;
    } catch (error) {
        queueLoadError = error.message;
        distributedQueue = null;
        queueEvents = null;
        return null;
    }
}

async function enqueueDistributedJob(name, data, options = {}) {
    const queue = getDistributedQueue();
    if (!queue) return null;
    if (!name || !data || typeof data !== 'object') throw new TypeError('Queue jobs require a name and JSON object data');
    return queue.add(name, data, {
        priority: Number.isInteger(options.priority) ? options.priority : 5,
        jobId: options.jobId,
        delay: Number.isInteger(options.delay) ? options.delay : undefined,
        attempts: Number.isInteger(options.attempts) ? options.attempts : undefined,
        removeOnComplete: options.removeOnComplete,
        removeOnFail: options.removeOnFail
    });
}

async function waitForDistributedJob(job, timeoutMs = 2500) {
    if (!job) return null;
    const queue = getDistributedQueue();
    if (!queue || !queueEvents) return null;
    return job.waitUntilFinished(queueEvents, timeoutMs);
}

async function offloadTask(name, data, timeoutMs = 30000) {
    const { enqueueIpcJob } = require('./ipc-queue');
    const distributedEnabled = String(process.env.DISTRIBUTED_QUEUE_ENABLED || 'false').toLowerCase() === 'true';
    const redisUrl = process.env.REDIS_URL;

    // Path 1: BullMQ (If Redis is configured)
    if (distributedEnabled && redisUrl) {
        try {
            const job = await enqueueDistributedJob(name, data);
            if (job) {
                const result = await waitForDistributedJob(job, timeoutMs);
                if (result !== undefined) return result;
            }
        } catch (e) {
            console.log(`[OFFLOAD] BullMQ failed for ${name}, trying IPC: ${e.message}`);
        }
    }

    // Path 2: IPC Bridge (Always available internal multi-threading)
    try {
        return await enqueueIpcJob(name, data, timeoutMs);
    } catch (e) {
        console.log(`[OFFLOAD] IPC failed for ${name}: ${e.message}`);
        return null;
    }
}

async function getDistributedQueueStats() {
    const queue = getDistributedQueue();
    if (!queue) return { enabled: false, queue: QUEUE_NAME, error: queueLoadError };
    const counts = await queue.getJobCounts('waiting', 'active', 'completed', 'failed', 'delayed');
    return { enabled: true, queue: QUEUE_NAME, counts };
}

function distributedQueueStatus() {
    return {
        enabled: distributedEnabled,
        configured: Boolean(process.env.REDIS_URL),
        queue: QUEUE_NAME,
        initialized: Boolean(distributedQueue),
        error: queueLoadError
    };
}

async function closeDistributedQueue() {
    await Promise.allSettled([
        distributedQueue?.close(),
        queueEvents?.close()
    ]);
    distributedQueue = null;
    queueEvents = null;
}

module.exports = {
    HeavyQueue,
    heavyQueue,
    QUEUE_NAME,
    getDistributedQueue,
    enqueueDistributedJob,
    waitForDistributedJob,
    getDistributedQueueStats,
    offloadTask,
    distributedQueueStatus,
    closeDistributedQueue,
    buildRedisConnection
};
