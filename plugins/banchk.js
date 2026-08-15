const { cmd } = require('../ahmad-core');
const { toSansBoldItalic, toBoldItalicSerif, randomFooter } = require('../lib/menu-styles');
const config = require('../config');
const axios = require('axios');

// ====================================================
// AHMAD MINI — BAN CHECKER v3.1
// ====================================================

cmd({
    pattern: 'banchk',
    alias: ['numcheck', 'checkban', 'isban'],
    desc: 'Check if a number is banned or active on WhatsApp',
    category: 'tools',
    react: '🔎'
}, async (conn, mek, m, { from, q, reply, mentionedJid, sender }) => {
    try {
        // 1. Determine target number
        let target = q ? q.replace(/[^0-9]/g, '') : (mentionedJid && mentionedJid[0] ? mentionedJid[0].split('@')[0] : null);
        
        // Fallback to quoted sender if no direct input
        if (!target && m.quoted) {
            target = m.quoted.sender.split('@')[0];
        }

        if (!target) return reply(`❌ ${toSansBoldItalic('Usage')}: .banchk 923xxxxxxxxx or reply to a message.`);

        await conn.sendMessage(from, { react: { text: '🔎', key: m.key } });
        const jid = `${target}@s.whatsapp.net`;
        
        let status = 'UNKNOWN';
        let banType = 'N/A';
        let exists = false;

        // 2. Fallback to Baileys onWhatsApp (Primary method in v3)
        const result = await conn.onWhatsApp(jid);
        exists = result && result[0] && result[0].exists;
        
        if (exists) {
            status = 'ACTIVE';
            banType = 'NONE';
        } else {
            status = 'BANNED / INACTIVE';
            banType = 'PERMANENT / NOT REG';
        }

        const B = toSansBoldItalic;
        const S = toBoldItalicSerif;
        const botName = config.BOT_NAME || '™ 𝑨𝑯𝑴𝑨𝑫 𝑴𝑰𝑵𝑰 ᥫᩣ';

        const bannedMsgs = [
            "Target Down! Ahmad your dad destroyed this number",
            "Ahmad your dad already banned this number. Don't touch bunty!",
            "Number Fucked by Ahmad your dad! Stay away or you're next",
            "Obsidian Luxe has terminated this target. Status: DELETED"
        ];

        const activeMsgs = [
            "Soon Ahmad ban the number keep away hacker",
            "Target spotted! Ahmad will ban this number soon",
            "Ahmad is tracking this number. Ban coming soon...",
            "Number is active but Ahmad your dad is coming for it"
        ];

        const randomBanned = bannedMsgs[Math.floor(Math.random() * bannedMsgs.length)];
        const randomActive = activeMsgs[Math.floor(Math.random() * activeMsgs.length)];

        let messageText = `╭━━━〔 🔎 ${B('AHMAD BAN CHECK')} 🔎 〕━━━╮\n` +
            `┃\n` +
            `┃ 🎯 ${B('TARGET')} : +${target}\n` +
            `┃ ⚙️ ${B('STATUS')} : ${B(status)}\n` +
            `┃ 🚫 ${B('TYPE')}   : ${B(banType)}\n` +
            `┃\n` +
            `╰━━━━━━━━━━━━━━━━━━━━━━╯\n\n` +
            `*${S(exists ? randomActive : randomBanned)}* 💀🔥\n\n` +
            `${config.BOT_FOOTER || randomFooter()}`;

        await conn.sendMessage(from, {
            text: messageText,
            contextInfo: {
                forwardingScore: 999,
                isForwarded: true,
                forwardedNewsletterMessageInfo: {
                    newsletterJid: config.CHANNEL_JID || "120363407376142647@newsletter",
                    newsletterName: botName,
                    serverMessageId: 2,
                },
                mentionedJid: [sender]
            }
        }, { quoted: mek });

    } catch (e) {
        console.error('BANCHK ERROR:', e);
        reply(`❌ ${toSansBoldItalic('Ahmad Check failed')}: ${e.message}`);
    }
});
