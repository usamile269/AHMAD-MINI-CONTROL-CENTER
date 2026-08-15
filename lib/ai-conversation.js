const crypto = require('crypto');
const { loadConversation, saveConversation } = require('../data/AIConversation');

const TTL_MS = 7 * 24 * 60 * 60 * 1000;
const MAX_TURNS = 12;
const MAX_TEXT_CHARS = 600;
const AUTO_REPLY_MARK_TTL_MS = 2 * 60 * 1000;

const cache = new Map(); // conversationKey -> turns
const hydration = new Map(); // conversationKey -> Promise<turns>
const writeChains = new Map(); // conversationKey -> Promise<void>
const autoReplyMarks = new Map(); // signature -> expiry timestamp

function compactText(value, maxChars = MAX_TEXT_CHARS) {
    const text = String(value || '').replace(/\s+/g, ' ').trim();
    return text.length <= maxChars ? text : `${text.slice(0, maxChars - 1).trimEnd()}…`;
}

function normalizeText(value) {
    return compactText(value, 800)
        .toLowerCase()
        .replace(/["“”‘’'`]/g, '')
        .replace(/[^\p{L}\p{N}]+/gu, ' ')
        .trim();
}

function freshTurns(turns, now = Date.now()) {
    if (!Array.isArray(turns)) return [];
    return turns
        .filter(turn => turn && ['contact', 'owner', 'assistant'].includes(turn.role) && Number.isFinite(turn.ts) && now - turn.ts >= 0 && now - turn.ts <= TTL_MS)
        .slice(-MAX_TURNS)
        .map(turn => ({ role: turn.role, text: compactText(turn.text), ts: turn.ts }));
}

async function getTurns(conversationKey) {
    if (cache.has(conversationKey)) return freshTurns(cache.get(conversationKey));
    if (!hydration.has(conversationKey)) {
        hydration.set(conversationKey, (async () => {
            const doc = await loadConversation(conversationKey);
            const turns = freshTurns(doc?.turns);
            cache.set(conversationKey, turns);
            hydration.delete(conversationKey);
            return turns;
        })().catch(error => {
            hydration.delete(conversationKey);
            cache.set(conversationKey, []);
            return [];
        }));
    }
    return hydration.get(conversationKey);
}

function queueSave(conversationKey, turns) {
    const snapshot = turns.map(turn => ({ ...turn }));
    const previous = writeChains.get(conversationKey) || Promise.resolve();
    const next = previous
        .catch(() => {})
        .then(() => saveConversation(conversationKey, { turns: snapshot, lastAt: new Date().toISOString() }))
        .catch(() => {});
    writeChains.set(conversationKey, next);
    return next;
}

async function appendTurn(conversationKey, role, text) {
    const turns = await getTurns(conversationKey);
    const clean = compactText(text);
    if (!clean) return turns;
    const next = [...freshTurns(turns), { role, text: clean, ts: Date.now() }].slice(-MAX_TURNS);
    cache.set(conversationKey, next);
    void queueSave(conversationKey, next);
    return next;
}

function buildMessages(turns, currentText, { repair = false } = {}) {
    const system = [
        'You compose one natural WhatsApp reply on behalf of the account owner.',
        'Reply in the same language and script as the latest incoming message.',
        'Use the recent messages only for continuity. Answer the latest message directly and do not invent a topic or assume a task.',
        'Output only the send-ready reply: no analysis, quotes, translations, options, headings, or meta-commentary.',
        'Keep casual chat short and warm. Do not be rude, abusive, mocking, or make promises for the owner.',
        'Do not repeat the sender, reuse a stock phrase, or mention being an AI or a bot.',
        repair ? 'The previous draft was rejected. Produce a different, specific reply and never mention that draft.' : ''
    ].filter(Boolean).join(' ');

    const messages = [{ role: 'system', content: system }];
    for (const turn of freshTurns(turns)) {
        messages.push({
            role: turn.role === 'contact' ? 'user' : 'assistant',
            content: turn.text
        });
    }
    messages.push({ role: 'user', content: compactText(currentText) });
    return messages;
}

function replySignature(conversationKey, text) {
    return crypto.createHash('sha1').update(`${conversationKey}|${normalizeText(text)}`).digest('hex');
}

function markAutomatedReply(conversationKey, text) {
    const signature = replySignature(conversationKey, text);
    autoReplyMarks.set(signature, Date.now() + AUTO_REPLY_MARK_TTL_MS);
}

function consumeAutomatedReplyMark(conversationKey, text) {
    const now = Date.now();
    for (const [signature, expiry] of autoReplyMarks) {
        if (expiry <= now) autoReplyMarks.delete(signature);
    }
    const signature = replySignature(conversationKey, text);
    const expiry = autoReplyMarks.get(signature);
    if (!expiry || expiry <= now) return false;
    autoReplyMarks.delete(signature);
    return true;
}

module.exports = {
    TTL_MS,
    MAX_TURNS,
    getTurns,
    appendTurn,
    buildMessages,
    markAutomatedReply,
    consumeAutomatedReplyMark,
    compactText
};
