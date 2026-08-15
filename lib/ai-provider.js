// ============================================================================
// lib/ai-provider.js — single shared "ask an AI" entry point.
// ----------------------------------------------------------------------------
// Previously this exact Groq -> OpenRouter -> (caller's own old proxy)
// logic was copy-pasted into plugins/ai-cmds.js AND plugins/ahmad-ai-batch1.js
// separately. Pulled out here so there's one place to update keys/models/
// order, and so the new .aiby DM auto-reply feature (main.js) can reuse the
// exact same reliable chain instead of a third copy.
// ============================================================================

const axios = require('axios');
const http = require('http');
const https = require('https');
const config = require('../config');

// 🆕 SPEED FIX (Bunty: "speed maintain/tez karay wo add"): a plain axios
// call opens a fresh TCP+TLS connection every single request. keepAlive
// agents reuse the same connection across calls to the same host, which
// shaves real time off every Groq/OpenRouter request (most noticeable when
// the bot is getting hit with several AI commands close together).
const keepAliveHttp = new http.Agent({ keepAlive: true, maxSockets: 50 });
const keepAliveHttps = new https.Agent({ keepAlive: true, maxSockets: 50 });
const fastAxios = axios.create({ httpAgent: keepAliveHttp, httpsAgent: keepAliveHttps });
// Public fallback providers fail intermittently over shared IPv6/keep-alive routes.
// Use a fresh IPv4 connection for them; real keyed providers keep the fast client.
const publicIpv4Http = new http.Agent({ keepAlive: false, family: 4 });
const publicIpv4Https = new https.Agent({ keepAlive: false, family: 4 });
const publicAxios = axios.create({ httpAgent: publicIpv4Http, httpsAgent: publicIpv4Https });

function normalizeMessages(input) {
    if (Array.isArray(input)) {
        return input
            .filter(message => message && typeof message.content === 'string' && message.content.trim())
            .map(message => ({ role: message.role || 'user', content: message.content.trim() }));
    }
    return [{ role: 'user', content: String(input || '').trim() }];
}

async function groqReply(input) {
    if (!config.GROQ_API_KEY) throw new Error('GROQ_API_KEY not set');
    const res = await fastAxios.post('https://api.groq.com/openai/v1/chat/completions', {
        model: config.GROQ_MODEL || 'openai/gpt-oss-20b',
        messages: normalizeMessages(input),
        temperature: 0.65,
        max_tokens: 320
    }, {
        headers: { Authorization: `Bearer ${config.GROQ_API_KEY}`, 'Content-Type': 'application/json' },
        timeout: 15000
    });
    const answer = res.data?.choices?.[0]?.message?.content;
    if (!answer) throw new Error('Groq: no reply');
    return answer;
}

async function openRouterReply(input) {
    if (!config.OPENROUTER_API_KEY) throw new Error('OPENROUTER_API_KEY not set');
    const res = await fastAxios.post('https://openrouter.ai/api/v1/chat/completions', {
        model: 'meta-llama/llama-3.3-70b-instruct:free',
        messages: normalizeMessages(input),
        temperature: 0.65,
        max_tokens: 320
    }, {
        headers: {
            Authorization: `Bearer ${config.OPENROUTER_API_KEY}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': 'https://ahmad-mini.bot',
            'X-Title': 'Ahmad Mini'
        },
        timeout: 15000
    });
    const answer = res.data?.choices?.[0]?.message?.content;
    if (!answer) throw new Error('OpenRouter: no reply');
    return answer;
}

// Historical no-key fallback retained from the last natural-reply version.
// It is optional and never replaces Groq/OpenRouter when those are configured.
async function bjDevsReply(input) {
    const prompt = normalizeMessages(input).map(message => `${message.role}: ${message.content}`).join('\n');
    const res = await publicAxios.get('https://gpt-3-5.apis-bj-devs.workers.dev/', {
        params: { prompt: String(prompt || '').slice(0, 12000) },
        timeout: 15000,
        family: 4,
        headers: {
            'User-Agent': 'Mozilla/5.0 MINI-FINAL/1.0',
            Accept: 'application/json, text/plain, */*'
        },
        validateStatus: () => true
    });
    let body = res.data;
    if (typeof body === 'string') {
        try { body = JSON.parse(body); } catch (_) {}
    }
    const answer = body?.reply || body?.result?.reply || body?.text || body?.answer;
    if (res.status >= 400 || body?.status === false || typeof answer !== 'string' || !answer.trim() || looksLikeErrorPayload(answer)) {
        throw new Error(`BJ Devs unavailable (HTTP ${res.status})`);
    }
    return answer.trim();
}

async function llm7Reply(input) {
    const res = await publicAxios.post('https://api.llm7.io/v1/chat/completions', {
        // `fast` echoed the user's text and ignored context in live probes.
        // This free quality-focused chat model correctly follows multi-turn roles.
        model: config.LLM7_MODEL || 'gemini-3.1-flash-lite',
        messages: normalizeMessages(input),
        temperature: 0.65,
        max_tokens: 180
    }, {
        timeout: 20000,
        family: 4,
        headers: {
            Authorization: 'Bearer unused',
            'Content-Type': 'application/json',
            'User-Agent': 'MINI-FINAL/1.0'
        },
        validateStatus: () => true
    });
    const answer = res.data?.choices?.[0]?.message?.content;
    if (res.status >= 400 || typeof answer !== 'string' || !answer.trim()) {
        throw new Error(`LLM7 unavailable (HTTP ${res.status})`);
    }
    return answer.trim();
}

async function pollinationsReply(input) {
    const prompt = normalizeMessages(input).map(message => `${message.role}: ${message.content}`).join('\n');
    const res = await publicAxios.get(`https://text.pollinations.ai/${encodeURIComponent(String(prompt || '').slice(0, 12000))}`, {
        timeout: 15000,
        family: 4,
        headers: { 'User-Agent': 'Mozilla/5.0 MINI-FINAL/1.0', Accept: 'text/plain, application/json, */*' },
        validateStatus: () => true
    });
    const answer = typeof res.data === 'string' ? res.data : (res.data?.text || res.data?.output || '');
    if (res.status >= 400 || typeof answer !== 'string' || !answer.trim() || looksLikeErrorPayload(answer)) {
        throw new Error(`Pollinations unavailable (HTTP ${res.status})`);
    }
    return answer.trim();
}

// Detects a raw upstream error payload (e.g. Pollinations rate-limit JSON)
// getting passed through as if it were a real answer — used by the old
// free-proxy fallbacks that live outside this file.
function sanitizeAIAnswer(answer) {
    let text = String(answer ?? '').trim();
    if (!text) return '';
    if ((text.startsWith('"') && text.endsWith('"')) || (text.startsWith('“') && text.endsWith('”')) || (text.startsWith('‘') && text.endsWith('’'))) {
        text = text.slice(1, -1).trim();
    }
    text = text.replace(/^(?:haha|hahaha|lol|lmao|hmm)[,!:.]?\s+/i, '');
    return text.trim();
}

function looksLikeErrorPayload(text) {
    if (!text || typeof text !== 'string') return false;
    const t = text.trim();
    if (!t.startsWith('{')) return false;
    try {
        const parsed = JSON.parse(t);
        return !!(parsed.error || parsed.status === 429 || parsed.deprecation_notice);
    } catch {
        return /"error"\s*:|queue full|pollinations\.ai/i.test(t);
    }
}

// Quality-first routing: a first-answer race allowed the weak anonymous `fast`
// model to beat configured providers, which produced echoed/generic replies.
// Premium configured providers may race each other; public fallbacks remain
// sequential and are reached only when the quality route is unavailable.
async function smartAI(input) {
    const messages = normalizeMessages(input);
    const keyedAttempts = [];
    if (config.GROQ_API_KEY) keyedAttempts.push(groqReply(messages));
    if (config.OPENROUTER_API_KEY) keyedAttempts.push(openRouterReply(messages));

    if (keyedAttempts.length) {
        try {
            return sanitizeAIAnswer(await Promise.any(keyedAttempts));
        } catch (error) {
            // Fall through to the quality public route only if all configured
            // providers actually failed.
        }
    }

    const failures = [];
    for (const attempt of [llm7Reply, bjDevsReply, pollinationsReply]) {
        try {
            const answer = sanitizeAIAnswer(await attempt(messages));
            if (answer) return answer;
        } catch (error) {
            failures.push(error.message);
        }
    }
    throw new Error(`All AI providers failed: ${failures.join('; ')}`);
}

// 🆕 (.aibyahmad voice on): transcribe an incoming WhatsApp voice note via
// Groq's Whisper endpoint, then it gets treated as normal text for smartAI.
async function transcribeVoiceNote(audioBuffer) {
    if (!config.GROQ_API_KEY) throw new Error('GROQ_API_KEY not set');
    const FormData = require('form-data');
    const form = new FormData();
    form.append('file', audioBuffer, { filename: 'voice.ogg', contentType: 'audio/ogg' });
    form.append('model', 'whisper-large-v3');
    const res = await fastAxios.post('https://api.groq.com/openai/v1/audio/transcriptions', form, {
        headers: { Authorization: `Bearer ${config.GROQ_API_KEY}`, ...form.getHeaders() },
        timeout: 30000
    });
    return res.data?.text || null;
}

module.exports = { groqReply, openRouterReply, llm7Reply, smartAI, sanitizeAIAnswer, looksLikeErrorPayload, normalizeMessages, transcribeVoiceNote };
