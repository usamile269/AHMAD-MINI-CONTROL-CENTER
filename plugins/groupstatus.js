const { cmd } = require('../ahmad-core');
const { downloadContentFromMessage, generateWAMessage } = require('@whiskeysockets/baileys');
const { randomFooter } = require('../lib/menu-styles');
const crypto = require('crypto');

// 🆕 (Bunty: "AURA-MD wali file mein .gcstatus sahi hai, yeh lagao" then
// "fallback koi na, AURA wala hi lagao") — posts the content directly INTO
// the group via conn.relayMessage using groupStatusMessageV2, instead of
// the bot's own personal WhatsApp Status. No fallback to the old
// status@broadcast method anymore — this is the only path now, for every
// type (text/image/video/audio/sticker).
async function relayGroupStatusV2(conn, jid, msgContent) {
    const messageSecret = crypto.randomBytes(32);
    const msg = await generateWAMessage(jid, msgContent, {
        userJid: conn.user.id,
        upload: conn.waUploadToServer
    });
    const relayMsg = {
        groupStatusMessageV2: {
            message: msg.message,
            messageContextInfo: { messageSecret }
        }
    };
    await conn.relayMessage(jid, relayMsg, { messageId: msg.key.id });
    return msg;
}

// ============================================================================
// .gcstatus / .gstatus / .poststatus / .statuspost
// ----------------------------------------------------------------------------
// Posts directly into the group as a native Group Status (groupStatusMessageV2)
// — NOT the bot's personal WhatsApp Status. Unlike the old status@broadcast
// approach, this isn't subject to "only people who've saved the bot's number
// as a contact can see it" — it's genuinely a group-scoped post.
// ============================================================================

async function downloadQuotedMedia(quotedMsg, type) {
    const mediaTypeMap = { imageMessage: 'image', videoMessage: 'video', audioMessage: 'audio', stickerMessage: 'sticker' };
    const mediaType = mediaTypeMap[type];
    const stream = await downloadContentFromMessage(quotedMsg[type], mediaType);
    let buffer = Buffer.from([]);
    for await (const chunk of stream) buffer = Buffer.concat([buffer, chunk]);
    return buffer;
}

cmd({
    pattern: "groupstatus",
    alias: ["gstatus", "poststatus", "statuspost", "gcstatus"],
    desc: "Post text/image/video/audio/sticker as a native Group Status, visible to everyone in this group",
    category: "group",
    react: "📡",
    filename: __filename
}, async (conn, mek, m, { body, reply, from, isGroup }) => {
    try {
        if (!isGroup) return reply("❌ This command only works in groups.");
        await conn.sendMessage(from, { react: { text: "📡", key: m.key } });

        const caption = body.split(" ").slice(1).join(" ");
        const quoted = m.quoted?.message;

        const done = (label) => `╭═══ ✅ STATUS ═══⊷\n┃❃╭──────────────\n┃❃│ ✅ ${label}\n┃❃│ 🟢 Posted as this group's Status\n┃❃╰───────────────\n╰═════════════════⊷\n\n> ${randomFooter()}`;

        if (!quoted && caption) {
            // 🆕 (Bunty: "fallback koi na, AURA wala hi lagao") — dropped
            // the fallback entirely, groupStatusMessageV2 only now.
            await relayGroupStatusV2(conn, from, { text: caption });
            await conn.sendMessage(from, { react: { text: "✅", key: m.key } });
            return reply(done('Text status posted!'));
        }
        if (!quoted) {
            await conn.sendMessage(from, { react: { text: "❌", key: m.key } });
            return reply(`❌ No message or media!\n💡 Use: .gcstatus Hello\n💡 Or reply to media with .gcstatus`);
        }

        if (quoted.imageMessage) {
            const media = await downloadQuotedMedia(quoted, 'imageMessage');
            const imgCaption = caption || quoted.imageMessage.caption || '';
            await relayGroupStatusV2(conn, from, { image: media, caption: imgCaption });
            await conn.sendMessage(from, { react: { text: "✅", key: m.key } });
            return reply(done('Image status posted!'));
        }
        if (quoted.videoMessage) {
            const media = await downloadQuotedMedia(quoted, 'videoMessage');
            const vidCaption = caption || quoted.videoMessage.caption || '';
            // ✅ FIX: Added mimetype to ensure the video is processed correctly by relayMessage
            await relayGroupStatusV2(conn, from, { video: media, caption: vidCaption, mimetype: 'video/mp4' });
            await conn.sendMessage(from, { react: { text: "✅", key: m.key } });
            return reply(done('Video status posted!'));
        }
        if (quoted.audioMessage) {
            const media = await downloadQuotedMedia(quoted, 'audioMessage');
            await relayGroupStatusV2(conn, from, { audio: media, mimetype: "audio/mp4", ptt: false });
            await conn.sendMessage(from, { react: { text: "✅", key: m.key } });
            return reply(done('Audio status posted!'));
        }
        if (quoted.stickerMessage) {
            const media = await downloadQuotedMedia(quoted, 'stickerMessage');
            await relayGroupStatusV2(conn, from, { sticker: media });
            await conn.sendMessage(from, { react: { text: "✅", key: m.key } });
            return reply(done('Sticker status posted!'));
        }
        if (quoted.documentMessage || quoted.conversation || quoted.extendedTextMessage) {
            const text = caption || quoted.extendedTextMessage?.text || quoted.conversation || 'No text';
            await relayGroupStatusV2(conn, from, { text });
            await conn.sendMessage(from, { react: { text: "✅", key: m.key } });
            return reply(done('Text/Doc status posted!'));
        }

        await conn.sendMessage(from, { react: { text: "❌", key: m.key } });
        return reply(`❌ Unsupported media type — reply to image/video/audio/sticker/text.`);

    } catch (err) {
        console.log("GROUPSTATUS ERROR:", err);
        await conn.sendMessage(from, { react: { text: "❌", key: m.key } });
        reply(`❌ Error: ${err.message}\n📌 Ensure bot's account allows Status posting.`);
    }
});
