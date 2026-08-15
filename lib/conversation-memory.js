// Bounded in-memory conversation context for natural auto-replies.
// It intentionally keeps only recent turns in RAM: no full-chat archive,
// no cross-contact mixing, and no stale context after an idle conversation.

const DEFAULT_TTL_MS = 45 * 60 * 1000;
const DEFAULT_MAX_TURNS = 5;
const MAX_TURN_CHARS = 420;

function compactText(value, maxChars = MAX_TURN_CHARS) {
    const text = String(value || '')
        .replace(/\s+/g, ' ')
        .trim();
    if (text.length <= maxChars) return text;
    return `${text.slice(0, Math.max(0, maxChars - 1)).trimEnd()}…`;
}

function freshTurns(turns, { now = Date.now(), ttlMs = DEFAULT_TTL_MS, maxTurns = DEFAULT_MAX_TURNS } = {}) {
    if (!Array.isArray(turns)) return [];
    return turns
        .filter(turn => turn && Number.isFinite(turn.ts) && now - turn.ts >= 0 && now - turn.ts <= ttlMs)
        .slice(-Math.max(1, maxTurns))
        .map(turn => ({
            u: compactText(turn.u),
            a: compactText(turn.a),
            ts: turn.ts
        }));
}

function readConversation(memory, key, options = {}) {
    const fresh = freshTurns(memory.get(key), options);
    if (fresh.length) memory.set(key, fresh);
    else memory.delete(key);
    return fresh;
}

function addConversationTurn(memory, key, userText, assistantText, options = {}) {
    const now = options.now || Date.now();
    const existing = readConversation(memory, key, { ...options, now });
    const next = [...existing, {
        u: compactText(userText),
        a: compactText(assistantText),
        ts: now
    }].slice(-Math.max(1, options.maxTurns || DEFAULT_MAX_TURNS));
    memory.set(key, next);
    return next;
}

function renderConversationContext(turns, maxTurns = DEFAULT_MAX_TURNS) {
    const recent = Array.isArray(turns) ? turns.slice(-Math.max(1, maxTurns)) : [];
    if (!recent.length) return '';
    return recent.map((turn, index) => (
        `Turn ${index + 1}\nSender: ${compactText(turn.u)}\nPrevious reply: ${compactText(turn.a)}`
    )).join('\n\n');
}

module.exports = {
    DEFAULT_TTL_MS,
    DEFAULT_MAX_TURNS,
    compactText,
    freshTurns,
    readConversation,
    addConversationTurn,
    renderConversationContext
};
