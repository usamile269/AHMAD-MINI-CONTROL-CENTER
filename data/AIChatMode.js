const jsondb = require('../lib/mongo');

const AIChatMode = jsondb.model('AIChatMode');
const cache = new Map();
const CACHE_TTL_MS = 15000;

async function getAIChatModeState(botNumber, chatId) {
    const key = `${botNumber}:${chatId}`;
    const cached = cache.get(key);
    if (cached && Date.now() - cached.ts < CACHE_TTL_MS) {
        return { configured: cached.configured === true, enabled: cached.enabled === true };
    }
    try {
        const doc = await AIChatMode.findOne({ botNumber, chatId });
        const configured = Boolean(doc);
        const enabled = doc?.enabled === true;
        cache.set(key, { configured, enabled, ts: Date.now() });
        return { configured, enabled };
    } catch (_) {
        return { configured: false, enabled: false };
    }
}

async function getAIChatMode(botNumber, chatId) {
    const state = await getAIChatModeState(botNumber, chatId);
    return state.enabled;
}

async function setAIChatMode(botNumber, chatId, enabled) {
    const value = enabled === true;
    try {
        await AIChatMode.findOneAndUpdate(
            { botNumber, chatId },
            { botNumber, chatId, enabled: value },
            { upsert: true, new: true }
        );
        cache.set(`${botNumber}:${chatId}`, { configured: true, enabled: value, ts: Date.now() });
        return true;
    } catch (e) {
        console.error('[AIChatMode] save error:', e.message);
        return false;
    }
}

module.exports = { getAIChatMode, getAIChatModeState, setAIChatMode };

