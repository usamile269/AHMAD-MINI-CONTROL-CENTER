const { cmd } = require('../ahmad-core');
const axios = require('axios');
const config = require('../config');
const { randomFooter, toSansBoldItalic } = require('../lib/menu-styles');
const { looksLikeIdentityQuestion, identityAnswer, withLanguageMatch } = require('../lib/ai-persona');
const { smartAI, looksLikeErrorPayload } = require('../lib/ai-provider');
const { getAIChatMode, setAIChatMode } = require('../data/AIChatMode');
const { getAIAutoReplySettings, setAIAutoReplySettings } = require('../data/AIAutoReply');
const { accountSettingGuard } = require('../lib/account-guard');
// Direct provider calls keep one-shot AI commands independent from the media worker/IPC bridge.

const FOOTER = randomFooter();

function safeAIError(error) {
    return String(error?.message || 'unknown provider error')
        .replace(/(?:Bearer\s+|gsk_|sk-or-v1-)[A-Za-z0-9._-]+/gi, '[redacted]')
        .replace(/\s+/g, ' ')
        .slice(0, 280);
}

function aiReply(model, response) {
    return `╭═══ 🤖 ${model} ═══⊷\n┃❃╭──────────────\n┃❃│ ${response.split('\n').join('\n┃❃│ ')}\n┃❃╰───────────────\n╰═════════════════⊷\n\n${FOOTER}`;
}

const chatHistory = {}; // from -> [{u, a}, ...] capped at 3

function buildPromptWithMemory(from, q) {
    const hist = chatHistory[from] || [];
    const historyText = hist.map(h => `User: ${h.u}\nAssistant: ${h.a}`).join('\n');
    const base = withLanguageMatch(q);
    return historyText ? `Previous conversation:\n${historyText}\n\nNew message — ${base}` : base;
}

function saveToHistory(from, q, answer) {
    if (!chatHistory[from]) chatHistory[from] = [];
    chatHistory[from].push({ u: q, a: answer });
    if (chatHistory[from].length > 3) chatHistory[from].shift();
}

// 1. ai — explicit mode controller and one-shot question command.
// Mode is persisted per bot + chat and defaults OFF. In a group only an
// admin/owner can change it; a normal member can still use `.ai question`
// for a one-shot answer without enabling auto-replies for everyone.
cmd({ pattern: 'ai', desc: 'Toggle AI mode: .ai on, .ai off, .ai status, or ask a question', category: 'ai', react: '🤖' },
async (conn, mek, m, { reply, args, quoted, from, isGroup, isAdmins, isOwner, isMe, isPairedElsewhere, botNumber }) => {
    const first = (args[0] || '').toLowerCase();
    if (first === 'status') {
        const enabled = isGroup
            ? await getAIChatMode(botNumber, from)
            : (await getAIAutoReplySettings(botNumber)).enabled === true;
        return reply(`╭═══ 🤖 AI MODE ═══⊷\n┃❃│ ${toSansBoldItalic('Status')}: ${enabled ? 'ON ✅' : 'OFF 🔕'}\n┃❃│ ${toSansBoldItalic(isGroup ? 'Configuration saved for this group.' : 'Global DM auto-reply for this paired number.')}\n╰═════════════════⊷`);
    }
    if (first === 'on' || first === 'off') {
        if (isGroup) {
            if (!isAdmins && !isOwner) return reply('❌ Only group admins or the owner can change the AI mode.');
        } else if (!accountSettingGuard({ isOwner, isMe, isPairedElsewhere, reply })) {
            return;
        }
        const enabled = first === 'on';
        const saved = isGroup
            ? await setAIChatMode(botNumber, from, enabled)
            : (await Promise.all([
                // DM `.ai` is the global switch for every incoming DM on
                // this paired account. Keep the per-chat record in sync for
                // the owner's own chat so an in-flight reply is cancellable
                // and `.ai on` does not duplicate through the legacy branch.
                setAIAutoReplySettings(botNumber, { enabled }),
                setAIChatMode(botNumber, from, enabled)
            ])).every(Boolean);
        if (!saved) return reply('❌ Failed to save AI mode configuration.');
        const scopeText = isGroup
            ? (enabled ? 'AI will now automatically respond in this group.' : 'AI will remain silent in this group.')
            : (enabled ? 'AI will now automatically respond to all incoming DMs.' : 'AI will remain silent for all incoming DMs.');
        return reply(`╭═══ 🤖 AI MODE ═══⊷\n┃❃│ ${toSansBoldItalic('AI Auto-Reply')}: ${enabled ? 'ON ✅' : 'OFF 🔕'}\n┃❃│ ${toSansBoldItalic(scopeText)}\n┃❃│ ${toSansBoldItalic('For a one-shot answer, use')}: .ai <question>\n╰═════════════════⊷`);
    }

    const q = args.join(' ') || quoted?.text;
    if (!q) return reply('❌ Usage: .ai on | .ai off | .ai status | .ai <question>');
    if (looksLikeIdentityQuestion(q)) return reply(aiReply('AI POWERHOUSE', identityAnswer(q)));
    try {
        await conn.sendMessage(from, { react: { text: '⏳', key: mek.key } });
        const answer = await smartAI(withLanguageMatch(q));
        await conn.sendMessage(from, { react: { text: '✅', key: mek.key } });
        return reply(aiReply('AI POWERHOUSE', answer || '❌ AI failed to respond.'));
    } catch (e) {
        console.log('[AI] smartAI failed:', e.message);
        await conn.sendMessage(from, { react: { text: '❌', key: mek.key } });
        const detail = String(e?.message || '');
        if (/GROQ_API_KEY not set|OPENROUTER_API_KEY not set/i.test(detail)) {
            return reply('❌ AI is not configured on this deployment. Add GROQ_API_KEY or OPENROUTER_API_KEY in Railway Variables, then redeploy.');
        }
        return reply(`❌ AI provider is temporarily unavailable.\n▸ ${safeAIError(e)}`);
    }
});

// 2. gpt — flagship one-shot AI command
cmd({ pattern: 'gpt', alias: ['chatgpt'], desc: 'Chat with GPT AI (remembers recent context, replies in your language)', category: 'ai', react: '🤖' },
async (conn, mek, m, { reply, args, quoted, from }) => {
    const q = args.join(' ') || quoted?.text;
    if (!q) return reply(`❌ Usage: .gpt <your question>\n📝 Example: .gpt What is AI?`);

    if (looksLikeIdentityQuestion(q)) {
        return reply(aiReply('GPT', identityAnswer(q)));
    }

    try {
        await conn.sendMessage(from, { react: { text: '⏳', key: mek.key } });
        const prompt = buildPromptWithMemory(from, q);
        const answer = await smartAI(prompt);
        if (answer) saveToHistory(from, q, answer);
        await conn.sendMessage(from, { react: { text: '✅', key: mek.key } });
        return reply(aiReply('GPT', answer || '❌ AI failed to respond.'));
    } catch (e) {
        console.log('[GPT] smartAI failed:', e.message);
        await conn.sendMessage(from, { react: { text: '❌', key: mek.key } });
        reply('❌ AI service is busy — please try again later!');
    }
});

// 2. deepseek
cmd({ pattern: 'deepseek', alias: ['ds'], desc: 'Chat with DeepSeek AI', category: 'ai', react: '🧠' },
async (conn, mek, m, { reply, args, quoted, from }) => {
    const q = args.join(' ') || quoted?.text;
    if (!q) return reply(`❌ Usage: .deepseek <your question>`);
    if (looksLikeIdentityQuestion(q)) return reply(aiReply('DEEPSEEK AI', identityAnswer(q)));
    try {
        await conn.sendMessage(from, { react: { text: '⏳', key: mek.key } });
        const prompt = withLanguageMatch(q);
        const answer = await smartAI(prompt);
        await conn.sendMessage(from, { react: { text: '✅', key: mek.key } });
        return reply(aiReply('DEEPSEEK AI', answer || '❌ AI failed to respond.'));
    } catch (e) {
        console.log('[DEEPSEEK] smartAI failed:', e.message);
        await conn.sendMessage(from, { react: { text: '❌', key: mek.key } });
        reply('❌ DeepSeek failed, try again later!');
    }
});

// 3. gemini
cmd({ pattern: 'gemini', alias: ['gem', 'google-ai'], desc: 'Chat with Gemini AI', category: 'ai', react: '💫' },
async (conn, mek, m, { reply, args, quoted, from }) => {
    const q = args.join(' ') || quoted?.text;
    if (!q) return reply(`❌ Usage: .gemini <your question>`);
    if (looksLikeIdentityQuestion(q)) return reply(aiReply('GEMINI', identityAnswer(q)));
    try {
        await conn.sendMessage(from, { react: { text: '⏳', key: mek.key } });
        const prompt = withLanguageMatch(q);
        const answer = await smartAI(prompt);
        await conn.sendMessage(from, { react: { text: '✅', key: mek.key } });
        return reply(aiReply('GEMINI 1.5', answer || '❌ AI failed to respond.'));
    } catch (e) {
        console.log('[GEMINI] smartAI failed:', e.message);
        await conn.sendMessage(from, { react: { text: '❌', key: mek.key } });
        reply('❌ Gemini failed, try again later!');
    }
});

// 4. gsearch
cmd({ pattern: 'gsearch', alias: ['google', 'search'], desc: 'Search the web', category: 'ai', react: '🔍' },
async (conn, mek, m, { reply, args, from }) => {
    const q = args.join(' ');
    if (!q) return reply('❌ Usage: .gsearch <query>\n📝 Example: .gsearch best food in Pakistan');
    try {
        await conn.sendMessage(from, { react: { text: '⏳', key: mek.key } });
        // Siputzx's Google route now returns 404. DuckDuckGo's public JSON
        // endpoint provides an answer/related topics without an API key.
        const res = await axios.get('https://api.duckduckgo.com/', {
            params: { q, format: 'json', no_html: 1, skip_disambig: 1 },
            timeout: 15000,
            headers: { 'User-Agent': 'MINI-FINAL/1.0 (search client)' }
        });
        const lines = [];
        if (res.data?.AbstractText) lines.push(`1. ${res.data.Heading || q}\n┃❃│    🔗 ${res.data.AbstractURL || `https://www.google.com/search?q=${encodeURIComponent(q)}`}`);
        for (const topic of (res.data?.RelatedTopics || [])) {
            if (topic?.FirstURL && topic?.Text) lines.push(`${lines.length + 1}. ${topic.Text}\n┃❃│    🔗 ${topic.FirstURL}`);
            if (lines.length >= 5) break;
        }
        if (!lines.length) lines.push(`1. Open web results\n┃❃│    🔗 https://www.google.com/search?q=${encodeURIComponent(q)}`);
        await conn.sendMessage(from, { react: { text: '✅', key: mek.key } });
        return reply(`╭═══ 🔍 WEB SEARCH ═══⊷\n┃❃│ 🔎 Query: ${q}\n┃❃╭──────────────\n┃❃│ ${lines.join('\n┃❃│ ')}\n┃❃╰───────────────\n╰═════════════════⊷\n\n${FOOTER}`);
    } catch (e) {
        console.log('[GSEARCH] DuckDuckGo failed:', e.message);
        await conn.sendMessage(from, { react: { text: '❌', key: mek.key } });
        return reply(`❌ Search service unavailable. Try: https://www.google.com/search?q=${encodeURIComponent(q)}`);
    }
});
