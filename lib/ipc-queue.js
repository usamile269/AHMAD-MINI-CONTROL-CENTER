'use strict';

const EventEmitter = require('events');
const crypto = require('crypto');

/**
 * 🚀 IPC-QUEUE BRIDGE (Zero-Config Multi-Threading)
 * 
 * This allows the main bot to offload heavy tasks (YouTube resolution) to the 
 * internal background worker process via Node.js IPC (process.send) instead of 
 * Redis. This gives "Distributed" performance on a single Railway server.
 */

const ipcEvents = new EventEmitter();
let internalWorker = null;
const pendingJobs = new Map(); // jobId -> { resolve, reject, timeout }

function setInternalWorker(worker) {
    internalWorker = worker;
    internalWorker.on('message', (msg) => {
        if (msg?.type === 'job_result' && msg.id) {
            const job = pendingJobs.get(msg.id);
            if (job) {
                clearTimeout(job.timeout);
                pendingJobs.delete(msg.id);
                if (msg.error) job.reject(new Error(msg.error));
                else job.resolve(msg.data);
            }
        }
    });
}

async function enqueueIpcJob(name, data, timeoutMs = 15000) {
    if (!internalWorker) return null;
    const id = `ipc-${name}-${crypto.randomBytes(4).toString('hex')}`;
    
    return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
            if (pendingJobs.has(id)) {
                pendingJobs.delete(id);
                reject(new Error(`IPC job ${name} timed out after ${timeoutMs}ms`));
            }
        }, timeoutMs);

        pendingJobs.set(id, { resolve, reject, timeout });
        
        try {
            internalWorker.send({ type: 'job_run', id, name, data });
        } catch (err) {
            clearTimeout(timeout);
            pendingJobs.delete(id);
            reject(err);
        }
    });
}

module.exports = { setInternalWorker, enqueueIpcJob };
