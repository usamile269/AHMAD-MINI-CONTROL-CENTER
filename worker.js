'use strict';

require('dotenv').config();
const axios = require('axios');
const { Worker } = require('bullmq');
const { QUEUE_NAME, buildRedisConnection } = require('./lib/queue');

const connection = buildRedisConnection();
if (!connection) {
    console.log('[WORKER] REDIS_URL not found. Running in IPC Bridge mode (Internal Multi-Threading).');
}

const MAX_JOB_TIMEOUT_MS = Math.max(3000, Number(process.env.WORKER_JOB_TIMEOUT_MS) || 15000);
const CONCURRENCY = Math.max(1, Math.min(8, Number(process.env.WORKER_CONCURRENCY) || 2));
const HTTP_HEADERS = {
    'User-Agent': 'MINI-FINAL-WORKER/1.0',
    'Accept': 'application/json, text/plain, */*'
};
const FIRST_PARTY_URL = String(process.env.AHMAD_MEDIA_API_URL || '').replace(/\/$/, '');
const FIRST_PARTY_KEY = String(process.env.AHMAD_MEDIA_API_KEY || '');
const { smartAI } = require('./lib/ai-provider');
const { tiktokStalk, instaStalk } = require('./lib/stalker-api');
const { renderProfileImageCard, renderRankCard } = require('./lib/profile-card-image');
const sharp = require('sharp');
const ffmpegPath = require('@ffmpeg-installer/ffmpeg').path;
const ffmpeg = require('fluent-ffmpeg');
const fs = require('fs-extra');
const path = require('path');
const { tmpdir } = require('os');
ffmpeg.setFfmpegPath(ffmpegPath);

function isYouTubeUrl(value) {
    try {
        const parsed = new URL(String(value));
        return ['youtube.com', 'www.youtube.com', 'm.youtube.com', 'youtu.be', 'www.youtu.be'].includes(parsed.hostname.toLowerCase());
    } catch (_) {
        return false;
    }
}

function providerHeaders() {
    return FIRST_PARTY_KEY ? { ...HTTP_HEADERS, 'x-ahmad-api-key': FIRST_PARTY_KEY } : HTTP_HEADERS;
}

async function firstParty(kind, url) {
    if (!FIRST_PARTY_URL) return null;
    const endpoint = `${FIRST_PARTY_URL}/api/ytmp${kind === 'audio' ? '3' : '4'}?url=${encodeURIComponent(url)}`;
    const { data } = await axios.get(endpoint, { timeout: 8000, headers: providerHeaders() });
    if (!data?.status || !data.result) return null;
    return kind === 'audio' ? (data.result.mp3 || data.result.url) : (data.result.video_download || data.result.mp4 || data.result.url);
}

async function jawad(kind, url) {
    const { data } = await axios.get(`https://jawad-tech.vercel.app/download/ytdl?url=${encodeURIComponent(url)}`, { timeout: 8000, headers: HTTP_HEADERS });
    if (!data?.status || !data.result) return null;
    return kind === 'audio' ? data.result.mp3 : data.result.mp4;
}

async function adeelVideo(url) {
    const { data } = await axios.get(`https://adeel-xtech-apis.vercel.app/api/ytmp4?url=${encodeURIComponent(url)}`, { timeout: 8000, headers: HTTP_HEADERS });
    return data?.status ? data?.result?.video_download : null;
}

async function elite(kind, url) {
    const { data } = await axios.get(`https://eliteprotech-apis.zone.id/ytdown?url=${encodeURIComponent(url)}&format=${kind === 'audio' ? 'mp3' : 'mp4'}`, { timeout: 5000, headers: HTTP_HEADERS });
    return data?.success ? data?.downloadURL : null;
}

async function resolveMedia(kind, url) {
    if (!isYouTubeUrl(url)) {
        // Fallback for non-YouTube links (e.g. TikTok/Insta if supported by providers)
        console.log(`[WORKER] Non-YouTube URL: ${url}. Attempting universal providers...`);
    }
    const providers = kind === 'video'
        ? [
            ['AhmadMediaAPI', () => firstParty(kind, url)],
            ['AdeelXtech', () => adeelVideo(url)],
            ['JawadTech', () => jawad(kind, url)],
            ['ElitePro', () => elite(kind, url)]
        ]
        : [
            ['AhmadMediaAPI', () => firstParty(kind, url)],
            ['JawadTech', () => jawad(kind, url)],
            ['ElitePro', () => elite(kind, url)]
        ];

    let lastError;
    for (const [name, call] of providers) {
        try {
            const mediaUrl = await call();
            if (!mediaUrl || !/^https?:\/\//i.test(mediaUrl)) throw new Error('provider returned no valid URL');
            return { url: mediaUrl, provider: name, kind };
        } catch (error) {
            lastError = error;
            console.warn(`[WORKER] ${name} ${kind} failed: ${error.message}`);
        }
    }
    throw new Error(`All distributed ${kind} providers failed: ${lastError?.message || 'unknown error'}`);
}

// 🚀 BullMQ Worker (Only if Redis is present)
let worker = null;
if (connection) {
    worker = new Worker(QUEUE_NAME, async (job) => {
    switch (job.name) {
        case 'media.resolve': {
            const kind = job.data?.kind === 'video' ? 'video' : 'audio';
            const url = String(job.data?.url || '').trim();
            return resolveMedia(kind, url);
        }
        case 'ai.chat': {
            const { text, userJid, userName } = job.data;
            return smartAI(text, userJid, userName);
        }
        case 'stalk.resolve': {
            const { type, query } = job.data;
            if (type === 'tiktok') return tiktokStalk(query);
            if (type === 'insta') return instaStalk(query);
            throw new Error(`Unsupported stalk type: ${type}`);
        }
        case 'media.convert': {
            const { type, buffer, options } = job.data;
            if (type === 'toimg') {
                const inputBuf = Buffer.from(buffer, 'base64');
                const outPath = path.join(tmpdir(), `conv_${Date.now()}.png`);
                // If it's an animated webp, we need to extract the first frame
                await sharp(inputBuf, { animated: true }).toFile(outPath);
                const result = await fs.readFile(outPath);
                await fs.remove(outPath);
                return result.toString('base64');
            }
            throw new Error(`Unsupported conversion type: ${type}`);
        }
        case 'media.render_profile': {
            const { data } = job.data;
            if (data.photoBuffer) data.photoBuffer = Buffer.from(data.photoBuffer, 'base64');
            const result = await renderProfileImageCard(data);
            return result.toString('base64');
        }
        case 'media.render_rank': {
            const { data } = job.data;
            if (data.photoBuffer) data.photoBuffer = Buffer.from(data.photoBuffer, 'base64');
            const result = await renderRankCard(data);
            return result.toString('base64');
        }
            case 'drama.resolve': {
                const { query } = job.data;
                let audioUrl = null;
                let title = query;

                // Fallback 1: JawadTech (Specific Drama API)
                try {
                    const { data } = await axios.get('https://jawad-tech.vercel.app/download/drama', { params: { q: query }, timeout: 8000 });
                    const result = data?.result || data;
                    audioUrl = result?.url || result?.download || (typeof result === 'string' && result.startsWith('http') ? result : null);
                    if (result?.title) title = result.title;
                } catch (_) {}

                // Fallback 2: Siputzx (Specific Drama API)
                if (!audioUrl) {
                    try {
                        const { data } = await axios.get(`https://api.siputzx.my.id/api/s/drama`, { params: { query: query }, timeout: 8000 });
                        const res = data?.data || data?.result || data;
                        audioUrl = res?.url || res?.audio || (Array.isArray(res) && res[0]?.url);
                        if (res?.title) title = res.title;
                    } catch (_) {}
                }

                // Fallback 3: YouTube Search + Ahmad First-Party Media API (Ultra Reliable)
                if (!audioUrl) {
                    try {
                        const yts = require('yt-search');
                        const search = await yts(`${query} drama story audio`);
                        const vid = search.videos[0];
                        if (vid) {
                            const resolved = await resolveMedia('audio', vid.url);
                            if (resolved?.url) {
                                audioUrl = resolved.url;
                                title = vid.title;
                            }
                        }
                    } catch (e) {
                        console.error('[WORKER] Drama YT fallback failed:', e.message);
                    }
                }

                if (!audioUrl || !audioUrl.startsWith('http')) throw new Error('Drama not found or all providers failed');
                return { audioUrl, title };
            }
            case 'sim.resolve': {
                const { number } = job.data;
                const formats = [number];
                if (number.startsWith('0')) formats.push(number.slice(1));
                else formats.push('0' + number);

                for (const fmt of formats) {
                    try {
                        // 🚀 PRIMARY API (Ahmad: "api bhi Sahi hai all Ali remove karoo wahi lgaoo yeh walii")
                        const apiUrl = `http://wasifali.biz.id/public_apis/sim-info-api.php?search=${fmt}`;
                        const res = await axios.get(apiUrl, { 
                            timeout: 20000, 
                            validateStatus: () => true,
                            headers: { 
                                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                                'Accept': 'application/json'
                            } 
                        });
                        
                        // Handle the response format of wasifali.biz.id
                        if (res.data && (res.data.success === true || res.data.status === true)) {
                            const records = res.data.records || res.data.result || res.data.data;
                            if (Array.isArray(records) && records.length > 0) {
                                return { success: true, records: records, count: res.data.count || records.length };
                            }
                        }
                    } catch (e) {
                        console.error(`[WORKER] SIM API Attempt failed for ${fmt}:`, e.message);
                    }
                }
                return { success: false, error: "No record found" };
            }
        default:
            throw new Error(`Unsupported job: ${job.name}`);
    }
}, {

        connection,
        concurrency: CONCURRENCY,
        lockDuration: MAX_JOB_TIMEOUT_MS + 5000,
        limiter: { max: Math.max(1, CONCURRENCY * 2), duration: 1000 }
    });

    worker.on('ready', () => console.log(`[WORKER] Ready on queue ${QUEUE_NAME} with concurrency ${CONCURRENCY}`));
    worker.on('completed', (job) => console.log(`[WORKER] Completed ${job.name} ${job.id}`));
    worker.on('failed', (job, error) => console.error(`[WORKER] Failed ${job?.name} ${job?.id}: ${error.message}`));
    worker.on('error', (error) => console.error('[WORKER] Redis/worker error:', error.message));
}

// 🚀 IPC Bridge Listener (Always active for internal multi-threading)
process.on('message', async (msg) => {
    if (msg?.type === 'job_run' && msg.id) {
        try {
            let result;
            switch (msg.name) {
                case 'media.resolve': {
                    const kind = msg.data?.kind === 'video' ? 'video' : 'audio';
                    const url = String(msg.data?.url || '').trim();
                    result = await resolveMedia(kind, url);
                    break;
                }
                case 'ai.chat': {
                    const { text, userJid, userName } = msg.data;
                    result = await smartAI(text, userJid, userName);
                    break;
                }
                case 'stalk.resolve': {
                    const { type, query } = msg.data;
                    if (type === 'tiktok') result = await tiktokStalk(query);
                    else if (type === 'insta') result = await instaStalk(query);
                    else throw new Error(`Unsupported stalk type: ${type}`);
                    break;
                }
                case 'media.convert': {
                    const { type, buffer, options } = msg.data;
                    if (type === 'toimg') {
                        const inputBuf = Buffer.from(buffer, 'base64');
                        const outPath = path.join(tmpdir(), `conv_${Date.now()}.png`);
                        await sharp(inputBuf, { animated: true }).toFile(outPath);
                        const resBuf = await fs.readFile(outPath);
                        await fs.remove(outPath);
                        result = resBuf.toString('base64');
                    } else {
                        throw new Error(`Unsupported conversion type: ${type}`);
                    }
                    break;
                }
                case 'media.render_profile': {
                    const { data } = msg.data;
                    if (data.photoBuffer) data.photoBuffer = Buffer.from(data.photoBuffer, 'base64');
                    const resBuf = await renderProfileImageCard(data);
                    result = resBuf.toString('base64');
                    break;
                }
                case 'media.render_rank': {
                    const { data } = msg.data;
                    if (data.photoBuffer) data.photoBuffer = Buffer.from(data.photoBuffer, 'base64');
                    const resBuf = await renderRankCard(data);
                    result = resBuf.toString('base64');
                    break;
                }
                case 'drama.resolve': {
                    const { query } = msg.data;
                    let audioUrl = null;
                    let title = query;
                    
                    // Fallback 1: JawadTech
                    try {
                        const { data } = await axios.get('https://jawad-tech.vercel.app/download/drama', { params: { q: query }, timeout: 8000 });
                        const result = data?.result || data;
                        audioUrl = result?.url || result?.download || (typeof result === 'string' && result.startsWith('http') ? result : null);
                        if (result?.title) title = result.title;
                    } catch (_) {}

                    // Fallback 2: Siputzx
                    if (!audioUrl) {
                        try {
                            const { data } = await axios.get(`https://api.siputzx.my.id/api/s/drama`, { params: { query: query }, timeout: 8000 });
                            const res = data?.data || data?.result || data;
                            audioUrl = res?.url || res?.audio || (Array.isArray(res) && res[0]?.url);
                            if (res?.title) title = res.title;
                        } catch (_) {}
                    }

                    // Fallback 3: YouTube Search + Ahmad First-Party Media API
                    if (!audioUrl) {
                        try {
                            const yts = require('yt-search');
                            const search = await yts(`${query} drama story audio`);
                            const vid = search.videos[0];
                            if (vid) {
                                const resolved = await resolveMedia('audio', vid.url);
                                if (resolved?.url) {
                                    audioUrl = resolved.url;
                                    title = vid.title;
                                }
                            }
                        } catch (e) {
                            console.error('[WORKER] Drama YT fallback failed:', e.message);
                        }
                    }

                    if (!audioUrl || !audioUrl.startsWith('http')) throw new Error('Drama not found or all providers failed');
                    result = { audioUrl, title };
                    break;
                }
                case 'sim.resolve': {
                    const { number } = msg.data;
                    const formats = [number];
                    if (number.startsWith('0')) formats.push(number.slice(1));
                    else formats.push('0' + number);

                    let success = false;
                    for (const fmt of formats) {
                        try {
                            const apiUrl = `http://wasifali.biz.id/public_apis/sim-info-api.php?search=${fmt}`;
                            const res = await axios.get(apiUrl, { 
                                timeout: 20000, 
                                validateStatus: () => true,
                                headers: { 
                                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                                    'Accept': 'application/json'
                                } 
                            });
                            if (res.data && (res.data.success === true || res.data.status === true)) {
                                const records = res.data.records || res.data.result || res.data.data;
                                if (Array.isArray(records) && records.length > 0) {
                                    result = { success: true, records: records, count: res.data.count || records.length };
                                    success = true;
                                    break;
                                }
                            }
                        } catch (e) {}
                    }
                    if (!success) result = { success: false, error: "No record found" };
                    break;
                }
                default:
                    throw new Error(`Unsupported job: ${msg.name}`);
            }
            process.send({ type: 'job_result', id: msg.id, data: result });
        } catch (error) {
            process.send({ type: 'job_result', id: msg.id, error: error.message });
        }
    }
});

async function shutdown(signal) {
    console.log(`[WORKER] ${signal} — closing worker`);
    if (worker) await worker.close();
    process.exit(0);
}
process.once('SIGTERM', () => void shutdown('SIGTERM'));
process.once('SIGINT', () => void shutdown('SIGINT'));
