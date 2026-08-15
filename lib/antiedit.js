const { getAntieditStatus, getAntieditSendTo } = require('../data/Antiedit');
const { randomFooter, toSansBoldItalic } = require('./menu-styles');

/**
 * Manus Edition: Robust Protocol Extractor
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

/**
 * Manus Edition: Robust Content Unwrapper
 */
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
 * Manus Edition: Rich Text Extractor
 */
function extractManusText(message) {
    if (!message) return null;
    const unwrapped = unwrapManus(message);
    return unwrapped.conversation
        || unwrapped.extendedTextMessage?.text
        || unwrapped.imageMessage?.caption
        || unwrapped.videoMessage?.caption
        || unwrapped.documentMessage?.caption
        || unwrapped.text
        || unwrapped.caption
        || (unwrapped.audioMessage ? '🎵 [Audio Message]' : null)
        || (unwrapped.stickerMessage ? '🎨 [Sticker]' : null)
        || (unwrapped.contactMessage ? '👤 [Contact Card]' : null)
        || (unwrapped.locationMessage ? '📍 [Location]' : null)
        || null;
}

async function resolveChatId(conn, store, chatId, messageId) {
    if (store?.messages?.[chatId]?.some(m => m.key?.id === messageId)) return chatId;
    try {
        const lidMap = conn?.signalRepository?.lidMapping;
        if (lidMap && chatId) {
            const alt = chatId.endsWith('@lid') ? await lidMap.getPNForLID(chatId) : await lidMap.getLIDForPN(chatId);
            if (alt && store?.messages?.[alt]?.some(m => m.key?.id === messageId)) return alt;
        }
    } catch (e) {}
    for (const [cachedId, msgs] of Object.entries(store?.messages || {})) {
        if (Array.isArray(msgs) && msgs.some(m => m.key?.id === messageId)) return cachedId;
    }
    return chatId;
}

/**
 * Manus Edition: Core Edit Reporting Engine
 */
async function reportEdit(conn, store, chatId, messageId, participant, editedMessage) {
    try {
        const botNumber = conn.__miniBotNumber || conn.user.id.split(':')[0].split('@')[0];
        const isEnabled = await getAntieditStatus(botNumber, chatId);
        if (!isEnabled) return;

        const storedChatId = await resolveChatId(conn, store, chatId, messageId);
        const oldMsg = await store.loadMessage(storedChatId, messageId);



        const oldText = oldMsg ? extractManusText(oldMsg.message) : null;
        const newText = extractManusText(editedMessage) || '(no text content found)';

        const sendTo = await getAntieditSendTo(botNumber, chatId);
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

        const mentionJid = realParticipant.includes('@s.whatsapp.net') ? realParticipant : (senderNumber + '@s.whatsapp.net');
        const fromLine = senderName && senderName !== 'Me' && senderName !== senderNumber
            ? `@${senderNumber} (${bold(senderName)})`
            : `@${senderNumber}`;

        const now = new Date();
        const time = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
        const date = now.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

        const block = (val) => bold(val).replace(/\n/g, '\n┃ ');
        const alertText = `╭━━━ 💗 ${bold('MESSAGE UPDATED')} ━━━╮
┃ 𖹭 ${bold('EDIT HISTORY DETECTED')}
┣━━━━━━━━━━━━━━━━━━━━━━┫
┃ 👤 ${bold('From')}: ${fromLine}
┃ 💬 ${bold('Source')}: ${bold(isPrivate ? 'Your Private Chat' : 'This Chat')}
┃ 🕒 ${bold(time)}  •  ${bold(date)}
┣━━━━━━━━━━━━━━━━━━━━━━┫
┃ 📝 ${bold('BEFORE')}
┃ ${block(oldText || '(not cached / unknown)')}
┣━━━━━━━━━━━━━━━━━━━━━━┫
┃ ✨ ${bold('AFTER')}
┃ ${block(newText)}
┣━━━━━━━━━━━━━━━━━━━━━━┫
┃ 🕒 ${bold('Update captured successfully')}
╰━━━ 💗 ${bold('AHMAD MINI')} ━━━╯

${randomFooter()}`;

        await conn.sendMessage(destination, {
            text: alertText,
            mentions: [mentionJid]
        });

        // Keep the cache in sync for future edits
        if (store?.messages[storedChatId]) {
            const cached = store.messages[storedChatId].find(m => m.key?.id === messageId);
            if (cached) cached.message = editedMessage;
        }

    } catch (err) {
        console.error("[MANUS-EDIT] Error:", err);
    }
}

const handleAntiedit = async (conn, updates, store) => {
    for (const update of updates) {
        const proto = getManusProtocol(update.update?.message);
        const chatId = proto?.key?.remoteJid || update.key.remoteJid;
        const messageId = proto?.key?.id || update.key.id;
        const participant = proto?.key?.participant || update.key.participant || chatId;

        if (proto?.type === 14) {
            await reportEdit(conn, store, chatId, messageId, participant, proto.editedMessage);
        } else {
            const unwrapped = unwrapManus(update.update?.message);
            if (unwrapped?.protocolMessage?.editedMessage || unwrapped?.editedMessage) {
                const editedMsg = unwrapped?.protocolMessage?.editedMessage || unwrapped?.editedMessage;
                const protoKey = unwrapped?.protocolMessage?.key;
                const targetChatId = protoKey?.remoteJid || chatId;
                const targetMsgId = protoKey?.id || messageId;
                const targetPart = protoKey?.participant || participant;
                await reportEdit(conn, store, targetChatId, targetMsgId, targetPart, editedMsg);
            }
        }
    }
};

const handleAntieditUpsert = async (conn, messages, store) => {
    for (const mek of messages) {
        const proto = getManusProtocol(mek.message);
        const chatId = proto?.key?.remoteJid || mek.key.remoteJid;
        const messageId = proto?.key?.id || mek.key.id;
        const participant = proto?.key?.participant || mek.key.participant || chatId;

        if (proto?.type === 14) {
            await reportEdit(conn, store, chatId, messageId, participant, proto.editedMessage);
        } else {
            const unwrapped = unwrapManus(mek.message);
            if (unwrapped?.protocolMessage?.editedMessage || unwrapped?.editedMessage) {
                const editedMsg = unwrapped?.protocolMessage?.editedMessage || unwrapped?.editedMessage;
                const protoKey = unwrapped?.protocolMessage?.key;
                const targetChatId = protoKey?.remoteJid || chatId;
                const targetMsgId = protoKey?.id || messageId;
                const targetPart = protoKey?.participant || participant;
                await reportEdit(conn, store, targetChatId, targetMsgId, targetPart, editedMsg);
            }
        }
    }
};

module.exports = { handleAntiedit, handleAntieditUpsert };
