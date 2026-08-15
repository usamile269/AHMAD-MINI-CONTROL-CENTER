// ============================================================================
// plugins/ai-autoreply.js — ".aibyahmad" (Bunty: "gc mode bhi, har user apni
// setting/personality/footer .aibyahmad settings mein ja kar fully kar sake,
// heavy karo"). Bot's own UI/confirmation text is always English (Bunty:
// "bot ke messages English hi hon") — only the AI's actual DM replies match
// the other person's language.
//
// Toggle + all settings live per botNumber (each paired WhatsApp number is
// its own instance). The actual auto-reply SENDING happens in main.js (needs
// to see every incoming message, not just command messages) — this file is
// the settings/control surface.
// ============================================================================
const { cmd } = require('../ahmad-core');
const { getAIAutoReplySettings, setAIAutoReplySettings } = require('../data/AIAutoReply');
const { randomFooter, toSansBoldItalic } = require('../lib/menu-styles');
const { smartAI } = require('../lib/ai-provider');

// 🎨 (Bunty: ".aiby card cheap lag raha, sahi karo") — was using the same
// plain ┃❃│ box every other settings command uses. Given this its own
// distinct, premium look matching the ping/alive "OBSIDIAN LUXE" style
// (diamond border + sans-bold-italic title) instead of the generic template.
function box(title, lines) {
    return `╭◆──「 ✦ ${toSansBoldItalic(title)} ✦ 」──◆╮\n` +
        lines.map(l => `┃  ${l}`).join('\n') + '\n' +
        `╰──────────────────────╯\n\n` +
        `> ${randomFooter()}`;
}

function statusBox(s) {
    return box('AIBYAHMAD SETTINGS', [
        `🔌 DM Auto-Reply : ${s.enabled ? '✅ ON' : '❌ OFF'}`,
        `👥 Group Mode    : ${s.gcEnabled ? '✅ ON (mention/reply only)' : '❌ OFF'}`,
        `🛡️ Known Only    : ${s.onlyKnownContacts ? '✅ ON (saved contacts only)' : '❌ OFF (everyone)'}`,
        `🎙️ Voice Replies : ${s.voiceEnabled ? '✅ ON' : '❌ OFF'}`,
        `⏰ Active Hours  : ${(s.hoursStart !== null && s.hoursEnd !== null) ? `${s.hoursStart}:00–${s.hoursEnd}:00` : 'Always (24/7)'}`,
        `📊 Daily Summary : ${s.summaryEnabled ? `✅ ON @ ${s.summaryHour}:00` : '❌ OFF'}`,
        `🚫 Ignored       : ${s.ignoreList && s.ignoreList.length ? s.ignoreList.length + ' number(s)' : 'None'}`,
        `🎭 Persona       : ${s.persona ? s.persona.slice(0, 60) + (s.persona.length > 60 ? '…' : '') : 'Default (helpful assistant)'}`,
        `📝 Footer        : ${s.footer ? s.footer.slice(0, 40) : 'Default bot footer'}`,
        `──────────────`,
        `💡 .aibyahmad on/off`,
        `💡 .aibyahmad gc on/off`,
        `💡 .aibyahmad known on/off`,
        `💡 .aibyahmad voice on/off`,
        `💡 .aibyahmad persona <text>`,
        `💡 .aibyahmad footer <text> / footer off`,
        `💡 .aibyahmad ignore <number> / unignore <number>`,
        `💡 .aibyahmad hours <start>-<end> / hours off`,
        `💡 .aibyahmad summary on/off / summary hour <0-23>`,
        `💡 .aibyahmad test <message> — preview a reply live`
    ]);
}

cmd({
    pattern: "aibyahmad",
    alias: ["aiby", "aiauto", "autoai"],
    desc: "🤖 Full AI auto-reply system for your DMs/groups — persona, footer, hours, voice, ignore list",
    category: "settings",
    react: "🤖",
    use: ".aibyahmad on/off/gc/voice/persona/footer/ignore/hours/summary",
    filename: __filename
}, async (conn, mek, m, { from, isOwner, isMe, botNumber, args, reply }) => {
    // isMe (you're messaging yourself on the number you paired), not the
    // single global config.OWNER_NUMBER — this is per-instance, every paired
    // user configures their OWN DMs, same pattern as .setbotname/.setbotdp.
    if (!isMe && !isOwner) return reply(box('AIBYAHMAD', ['⛔ Only the number you paired can run this — it controls your own DM/group auto-replies.']));

    const sub = (args[0] || '').toLowerCase();
    const s = await getAIAutoReplySettings(botNumber);

    if (sub === 'on') {
        await setAIAutoReplySettings(botNumber, { enabled: true });
        reply(box('AIBYAHMAD', ['✅ DM Auto-Reply: ON', '💬 Anyone who DMs you now gets a real AI reply, understood in context.', '⚙️ Full control: .aibyahmad settings']));

    } else if (sub === 'off') {
        await setAIAutoReplySettings(botNumber, { enabled: false });
        reply(box('AIBYAHMAD', ['❌ DM Auto-Reply: OFF']));

    } else if (sub === 'gc') {
        const v = (args[1] || '').toLowerCase();
        if (v === 'on') {
            await setAIAutoReplySettings(botNumber, { gcEnabled: true });
            reply(box('AIBYAHMAD — GROUP MODE', ['✅ ON', '👥 In groups it only replies when you\'re @mentioned or someone replies to your message — never on every group message.']));
        } else if (v === 'off') {
            await setAIAutoReplySettings(botNumber, { gcEnabled: false });
            reply(box('AIBYAHMAD — GROUP MODE', ['❌ OFF']));
        } else {
            reply(box('AIBYAHMAD — GROUP MODE', [`Status: ${s.gcEnabled ? '✅ ON' : '❌ OFF'}`, '💡 .aibyahmad gc on/off']));
        }

    } else if (sub === 'known') {
        const v = (args[1] || '').toLowerCase();
        if (v === 'on') {
            await setAIAutoReplySettings(botNumber, { onlyKnownContacts: true });
            reply(box('AIBYAHMAD — KNOWN CONTACTS ONLY', ['✅ ON', '🛡️ Ban-risk reduction: only replies to numbers actually SAVED in your phone contacts — new/unknown numbers are skipped.']));
        } else if (v === 'off') {
            await setAIAutoReplySettings(botNumber, { onlyKnownContacts: false });
            reply(box('AIBYAHMAD — KNOWN CONTACTS ONLY', ['❌ OFF', '⚠️ Will now reply to everyone, saved or not.']));
        } else {
            reply(box('AIBYAHMAD — KNOWN CONTACTS ONLY', [`Status: ${s.onlyKnownContacts ? '✅ ON' : '❌ OFF'}`, '💡 .aibyahmad known on/off']));
        }

    } else if (sub === 'voice') {
        const v = (args[1] || '').toLowerCase();
        if (v === 'on') {
            await setAIAutoReplySettings(botNumber, { voiceEnabled: true });
            reply(box('AIBYAHMAD — VOICE REPLIES', ['✅ ON', '🎙️ Incoming voice notes are now transcribed and replied to as well.']));
        } else if (v === 'off') {
            await setAIAutoReplySettings(botNumber, { voiceEnabled: false });
            reply(box('AIBYAHMAD — VOICE REPLIES', ['❌ OFF']));
        } else {
            reply(box('AIBYAHMAD — VOICE REPLIES', [`Status: ${s.voiceEnabled ? '✅ ON' : '❌ OFF'}`, '💡 .aibyahmad voice on/off']));
        }

    } else if (sub === 'persona') {
        const text = args.slice(1).join(' ').trim();
        if (!text) return reply(box('AIBYAHMAD — PERSONA', [
            '⚠️ Usage: .aibyahmad persona <description>',
            '📝 Example: .aibyahmad persona You\'re a chill, friendly guy who talks casually and is a bit funny.'
        ]));
        await setAIAutoReplySettings(botNumber, { persona: text });
        reply(box('AIBYAHMAD — PERSONA', [`✅ Set!`, `🎭 "${text.slice(0, 150)}"`]));

    } else if (sub === 'footer') {
        const text = args.slice(1).join(' ').trim();
        if (!text) return reply(box('AIBYAHMAD — FOOTER', ['⚠️ Usage: .aibyahmad footer <text>', '💡 .aibyahmad footer off — reset to default bot footer']));
        if (text.toLowerCase() === 'off') {
            await setAIAutoReplySettings(botNumber, { footer: null });
            reply(box('AIBYAHMAD — FOOTER', ['✅ Reset to default bot footer.']));
        } else {
            await setAIAutoReplySettings(botNumber, { footer: text });
            reply(box('AIBYAHMAD — FOOTER', [`✅ Set!`, `📝 "${text.slice(0, 60)}"`, 'This only applies to AI auto-replies — every other command keeps the normal footer.']));
        }

    } else if (sub === 'ignore' || sub === 'unignore') {
        const num = (args[1] || '').replace(/[^0-9]/g, '');
        if (!num) return reply(box('AIBYAHMAD — IGNORE LIST', ['⚠️ Usage: .aibyahmad ignore <number>', '💡 .aibyahmad unignore <number>']));
        const list = new Set(s.ignoreList || []);
        if (sub === 'ignore') list.add(num); else list.delete(num);
        await setAIAutoReplySettings(botNumber, { ignoreList: [...list] });
        reply(box('AIBYAHMAD — IGNORE LIST', [
            sub === 'ignore' ? `✅ +${num} will no longer get auto-replies.` : `✅ +${num} unignored.`,
            `📋 Total ignored: ${list.size}`
        ]));

    } else if (sub === 'hours') {
        const arg = (args[1] || '').toLowerCase();
        if (arg === 'off') {
            await setAIAutoReplySettings(botNumber, { hoursStart: null, hoursEnd: null });
            reply(box('AIBYAHMAD — ACTIVE HOURS', ['✅ Reset — now active 24/7.']));
        } else {
            const match = arg.match(/^(\d{1,2})-(\d{1,2})$/);
            if (!match) return reply(box('AIBYAHMAD — ACTIVE HOURS', ['⚠️ Usage: .aibyahmad hours <start>-<end> (24h format)', '📝 Example: .aibyahmad hours 22-8   (active 10PM–8AM)', '💡 .aibyahmad hours off — always active']));
            const start = parseInt(match[1], 10), end = parseInt(match[2], 10);
            if (start < 0 || start > 23 || end < 0 || end > 23) return reply(box('AIBYAHMAD — ACTIVE HOURS', ['❌ Hours must be between 0-23.']));
            await setAIAutoReplySettings(botNumber, { hoursStart: start, hoursEnd: end });
            reply(box('AIBYAHMAD — ACTIVE HOURS', [`✅ Set: ${start}:00 – ${end}:00`, 'Outside this window, no DM gets an AI reply.']));
        }

    } else if (sub === 'summary') {
        const v = (args[1] || '').toLowerCase();
        if (v === 'on') {
            await setAIAutoReplySettings(botNumber, { summaryEnabled: true });
            reply(box('AIBYAHMAD — DAILY SUMMARY', ['✅ ON', `📊 A digest lands every day at ${s.summaryHour}:00 (how many people messaged you).`, '💡 .aibyahmad summary hour <0-23> — change the time']));
        } else if (v === 'off') {
            await setAIAutoReplySettings(botNumber, { summaryEnabled: false });
            reply(box('AIBYAHMAD — DAILY SUMMARY', ['❌ OFF']));
        } else if (v === 'hour') {
            const h = parseInt(args[2], 10);
            if (isNaN(h) || h < 0 || h > 23) return reply(box('AIBYAHMAD — DAILY SUMMARY', ['⚠️ Usage: .aibyahmad summary hour <0-23>']));
            await setAIAutoReplySettings(botNumber, { summaryHour: h });
            reply(box('AIBYAHMAD — DAILY SUMMARY', [`✅ Summary time set to ${h}:00`]));
        } else {
            reply(box('AIBYAHMAD — DAILY SUMMARY', [`Status: ${s.summaryEnabled ? `✅ ON @ ${s.summaryHour}:00` : '❌ OFF'}`, '💡 .aibyahmad summary on/off', '💡 .aibyahmad summary hour <0-23>']));
        }

    } else if (sub === 'test') {
        // 🆕 (Bunty: "kuch aisa add karo jis se main test kar sakoon live")
        // — simulates exactly what a real DM would trigger, WITHOUT needing
        // a second phone/number to actually message you. Also re-reads
        // settings fresh (bypassing the 15s cache) so you can immediately
        // confirm a save from .aibyahmad on/persona/etc actually landed.
        const testMsg = args.slice(1).join(' ').trim();
        if (!testMsg) return reply(box('AIBYAHMAD — TEST', [
            '⚠️ Usage: .aibyahmad test <a message to simulate>',
            '📝 Example: .aibyahmad test Hey, how are you?',
            '💡 Shows exactly what a real DM would get back — no second number needed.'
        ]));

        await conn.sendMessage(from, { react: { text: '🧪', key: mek.key } });

        if (!s.enabled && !s.gcEnabled) {
            reply(box('AIBYAHMAD — TEST', [
                '⚠️ Heads up: DM auto-reply is currently OFF (.aibyahmad on to enable).',
                '🧪 Simulating anyway so you can preview the reply:'
            ]));
        }

        const personaLine = s.persona ? `Your personality/how you talk: ${s.persona}\n` : '';
        const prompt = `${personaLine}You are personally replying to a WhatsApp message on behalf of the account owner (not as a generic bot/assistant — reply like a real person would). ` +
            `Reply in the SAME language and script they're writing in (English, Roman Urdu, or Urdu script). Keep it natural and reasonably short, like a real WhatsApp reply. ` +
            `If the message is about money, sensitive personal matters, or anything you shouldn't just decide on the owner's behalf, don't make promises or invent details — say you'll get back to them personally about it.\n` +
            `Their new message: ${testMsg}`;

        try {
            const answer = await smartAI(prompt);
            const finalText = answer + (s.footer ? `\n\n${s.footer}` : '');
            reply(box('AIBYAHMAD — TEST PREVIEW', [
                `📥 Simulated message: "${testMsg}"`,
                `──────────────`,
                `📤 AI would reply:`,
                finalText,
                `──────────────`,
                `🔌 DM: ${s.enabled ? '✅ ON' : '❌ OFF'} | 👥 GC: ${s.gcEnabled ? '✅ ON' : '❌ OFF'} | 🎭 Persona: ${s.persona ? 'custom' : 'default'}`
            ]));
        } catch (e) {
            reply(box('AIBYAHMAD — TEST', [`❌ AI failed to respond: ${e.message}`, '💡 Check GROQ_API_KEY / OPENROUTER_API_KEY in config.js']));
        }

    } else if (sub === 'settings' || sub === 'status' || !sub) {
        reply(statusBox(s));

    } else {
        reply(statusBox(s));
    }
});
