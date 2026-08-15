const { cmd } = require('../ahmad-core');
const { randomFooter, toSansBold } = require('../lib/menu-styles');
const config = require('../config');

// ====================================================
// AHMAD MINI — UTILITY TOOLS
// ====================================================

const FOOTER = () => "\n\n" + (config.BOT_FOOTER || randomFooter());

// 1. getpp - Get Profile Picture
cmd({
    pattern: 'getpp',
    alias: ['pp', 'profilepic', 'getpic'],
    desc: 'Get profile picture of a user',
    category: 'tools',
    react: '🖼️'
}, async (conn, mek, m, { from, reply, args, quoted, sender }) => {
    try {
        // Determine target JID
        let targetJid = '';
        if (quoted) {
            targetJid = quoted.sender;
        } else if (args[0]) {
            let num = args[0].replace(/[^0-9]/g, '');
            if (num.length < 10) return reply(`❌ ${toSansBold('Invalid number format.')}`);
            targetJid = num + '@s.whatsapp.net';
        } else {
            targetJid = sender;
        }

        const name = targetJid.split('@')[0];
        
        try {
            const ppUrl = await conn.profilePictureUrl(targetJid, 'image');
            
            await conn.sendMessage(from, {
                image: { url: ppUrl },
                caption: `╭═══ 🖼️ ${toSansBold('PROFILE PICTURE')} ═══⊷\n┃❃╭──────────────\n┃❃│ 👤 ${toSansBold('User')}: @${name}\n┃❃│ 📂 ${toSansBold('Format')}: High Resolution\n┃❃╰───────────────\n╰═════════════════⊷` + FOOTER(),
                mentions: [targetJid]
            }, { quoted: mek });
            
        } catch (err) {
            // If no profile picture or privacy settings prevent it
            reply(`❌ ${toSansBold('Could not retrieve profile picture.')}\n\n${toSansBold('Reason')}: User may have no PP or privacy settings are strict.` + FOOTER());
        }

    } catch (e) {
        console.error('GETPP ERROR:', e);
        reply(`❌ ${toSansBold('Error')}: ${e.message}`);
    }
});

// 2. getname - Get User Name from JID
cmd({
    pattern: 'getname',
    desc: 'Get WhatsApp name of a number',
    category: 'tools',
    react: '🆔'
}, async (conn, mek, m, { from, reply, args, quoted, sender }) => {
    try {
        let targetJid = quoted ? quoted.sender : (args[0] ? args[0].replace(/[^0-9]/g, '') + '@s.whatsapp.net' : sender);
        const contact = await conn.onWhatsApp(targetJid);
        
        if (contact && contact[0]) {
            reply(`🆔 ${toSansBold('Name found for')} @${targetJid.split('@')[0]}` + FOOTER(), { mentions: [targetJid] });
        } else {
            reply(`❌ ${toSansBold('User not found on WhatsApp.')}`);
        }
    } catch (e) {
        reply(`❌ ${toSansBold('Error')}: ${e.message}`);
    }
});
