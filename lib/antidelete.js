const config = require('../config');
const { randomFooter, toSansBoldItalic } = require('./menu-styles');
const { getAntideleteStatus, getAntideleteSendTo } = require('../data/Antidelete');

/**
 * Manus Edition: Robust Message Unwrapper
 * Recursively digs through all WhatsApp wrapper types (ephemeral, view-once, document-with-caption, etc.)
 * to find the actual content payload.
 */
function getManusProtocol(message) {
    let current = message;
    for (let i = 0; i < 6 && current; i += 1) {
        if (current.protocolMessage) return current.protocolMessage;
        if (current.ephemeralMessage?.message) current = current.ephemeralMessage.message;
        else if (current.viewOnceMessage?.message) current = current.viewOnceMessage.message;
        else if (current.viewOnceMessageV2?.message) current = current.viewOnceMessageV2.message;
        else if (current.viewOnceMessageV2Extension?.message) current = current.viewOnceMessageV2Extension.message;
        else if (current.documentWithCaptionMessage?.message) current = current.documentWithCaptionMessage.message;
        else if (current.message && typeof current.message === 'object') current = current.message;
        else break;
    }
    return null;
}

function unwrapManus(message) {
    if (!message) return null;
    let curr = message;
    for (let i = 0; i < 6 && curr; i++) {
        if (curr.message) curr = curr.message;
        else if (curr.ephemeralMessage?.message) curr = curr.ephemeralMessage.message;
        else if (curr.viewOnceMessage?.message) curr = curr.viewOnceMessage.message;
        else if (curr.viewOnceMessageV2?.message) curr = curr.viewOnceMessageV2.message;
        else if (curr.viewOnceMessageV2Extension?.message) curr = curr.viewOnceMessageV2Extension.message;
        else if (curr.documentWithCaptionMessage?.message) curr = curr.documentWithCaptionMessage.message;
        else if (curr.protocolMessage?.editedMessage) curr = curr.protocolMessage.editedMessage;
        else break;
    }
    return curr;
}

/**
 * Manus Edition: Rich Content Extractor
 * Extracts text, captions, and identifies media types for fallback reporting.
 */
function extractRichContent(unwrapped) {
    if (!unwrapped) return { text: null, type: 'unknown' };

    const text = unwrapped.conversation
        || unwrapped.extendedTextMessage?.text
        || unwrapped.imageMessage?.caption
        || unwrapped.videoMessage?.caption
        || unwrapped.documentMessage?.caption
        || unwrapped.text
        || unwrapped.caption
        || null;

    let type = 'text';
    if (unwrapped.imageMessage) type = 'image';
    else if (unwrapped.videoMessage) type = 'video';
    else if (unwrapped.audioMessage) type = 'audio';
    else if (unwrapped.stickerMessage) type = 'sticker';
    else if (unwrapped.documentMessage) type = 'document';
    else if (unwrapped.contactMessage || unwrapped.contactsArrayMessage) type = 'contact';
    else if (unwrapped.locationMessage) type = 'location';
    else if (unwrapped.pollCreationMessage) type = 'poll';

    return { text, type };
}

/**
 * Manus Edition: Robust Chat Resolver
 * Ensures we find the cached message regardless of LID/PN identity mismatches.
 */
async function resolveChatId(conn, store, chatId, messageId) {
    if (store?.messages?.[chatId]?.some(m => m.key?.id === messageId)) return chatId;

    // Check LID mapping if available
    try {
        const lidMap = conn?.signalRepository?.lidMapping;
        if (lidMap && chatId) {
            const alt = chatId.endsWith('@lid') ? await lidMap.getPNForLID(chatId) : await lidMap.getLIDForPN(chatId);
            if (alt && store?.messages?.[alt]?.some(m => m.key?.id === messageId)) return alt;
        }
    } catch (e) {}

    // Global search as last resort
    for (const [cachedId, msgs] of Object.entries(store?.messages || {})) {
        if (Array.isArray(msgs) && msgs.some(m => m.key?.id === messageId)) return cachedId;
    }
    return chatId;
}

/**
 * Manus Edition: The Core Recovery Engine
 */
async function sendRecoveredMessage(conn, store, chatId, messageId, participant) {
    try {
        const botNumber = conn.__miniBotNumber || conn.user.id.split(':')[0].split('@')[0];
        const isEnabled = await getAntideleteStatus(botNumber, chatId);
        if (!isEnabled) return;

        const storedChatId = await resolveChatId(conn, store, chatId, messageId);
        if (!store?.messages[storedChatId]) return;

        const msg = await store.loadMessage(storedChatId, messageId);
        if (!msg) return;

        const sendTo = await getAntideleteSendTo(botNumber, chatId);
        const isPrivate = sendTo === 'private';
        const destination = isPrivate ? (conn.__miniBotJid || `${botNumber}@s.whatsapp.net`) : chatId;

        // Identity Resolution
        let realParticipant = participant;
        if (realParticipant.endsWith('@lid')) {
            const alt = global.lidAltCache?.get(realParticipant) || (conn.signalRepository?.lidMapping?.getPNForLID ? await conn.signalRepository.lidMapping.getPNForLID(realParticipant).catch(() => null) : null);
            if (alt) realParticipant = alt;
        }

        const senderName = typeof conn.getName === 'function' ? conn.getName(realParticipant) : '';
        const senderNumber = realParticipant.split('@')[0].split(':')[0];
        const bold = (val) => toSansBoldItalic(String(val));

        // Mentions must use the full JID to be clickable blue links
        const mentionJid = senderNumber + '@s.whatsapp.net';
        const fromLine = senderName && senderName !== 'Me' && senderName !== senderNumber
            ? `@${senderNumber} (${bold(senderName)})`
            : `@${senderNumber}`;

        const isGroup = chatId.endsWith('@g.us');
        let sourceName = isGroup ? 'this group' : (isPrivate ? 'Your Private Chat' : 'This Chat');
        if (isGroup) {
            try { sourceName = (await conn.groupMetadata(chatId)).subject; } catch {}
        }

        const now = new Date();
        const time = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
        const date = now.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

        const alertText = `╭━━━ 💗 ${bold('MESSAGE RECOVERED')} ━━━╮
┃ 𖹭 ${bold('ORIGINAL CONTENT RESTORED')}
┣━━━━━━━━━━━━━━━━━━━━━━┫
┃ 👤 ${bold('From')}: ${fromLine}
┃ 💬 ${bold('Source')}: ${bold(sourceName)}
┃ 🕒 ${bold(time)}  •  ${bold(date)}
┣━━━━━━━━━━━━━━━━━━━━━━┫
┃ 🗑️ ${bold('Deleted message recovered')}
┃ ${bold('The original message is attached below.')}
╰━━━ 💗 ${bold('AHMAD MINI')} ━━━╯

${randomFooter()}`;

        // Step 1: Send the luxury alert card
        await conn.sendMessage(destination, { text: alertText, mentions: [mentionJid] });

        // Step 2: Content Recovery Pipeline
        const unwrapped = unwrapManus(msg.message || msg);
        let recovered = false;

        // A: Try Forwarding with JID correction
        try {
            const forwardKey = { ...msg.key, remoteJid: destination };
            await conn.sendMessage(destination, { forward: { key: forwardKey, message: unwrapped }, contextInfo: { isForwarded: false } });
            recovered = true;
        } catch (e) {
            if (config.DEBUG_LOGS) console.log('[MANUS-RECOVERY] Forward failed:', e.message);
        }

        // B: Try Direct Content Send (if forward failed)
        if (!recovered) {
            try {
                await conn.sendMessage(destination, unwrapped);
                recovered = true;
            } catch (e) {
                if (config.DEBUG_LOGS) console.log('[MANUS-RECOVERY] Direct send failed:', e.message);
            }
        }

        // C: Rich Text Fallback
        if (!recovered) {
            const { text, type } = extractRichContent(unwrapped);
            let fallback = `📝 *Recovered ${type} message:*`;
            if (text) fallback += `\n\n${text}`;
            else if (type !== 'text') fallback += `\n(Media content preserved in system cache)`;

            await conn.sendMessage(destination, { text: fallback }).catch(() => {});
        }

    } catch (err) {
        console.error("[MANUS-RECOVERY] Fatal Error:", err);
    }
}

const handleAntidelete = async (conn, updates, store) => {
    for (const update of updates) {
        const isRevoke = update.update.messageStubType === 68 || getManusProtocol(update.update.message)?.type === 0;
        if (!isRevoke) continue;
        await sendRecoveredMessage(conn, store, update.key.remoteJid, update.key.id, update.key.participant || update.key.remoteJid);
    }
};

const handleAntideleteUpsert = async (conn, messages, store) => {
    for (const mek of messages) {
        const proto = getManusProtocol(mek.message);
        if (proto?.type === 0) {
            await sendRecoveredMessage(conn, store, proto.key?.remoteJid || mek.key.remoteJid, proto.key?.id, mek.key.participant || proto.key?.participant || mek.key.remoteJid);
        }
    }
};

module.exports = { handleAntidelete, handleAntideleteUpsert };
