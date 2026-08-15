const { cmd } = require('../ahmad-core');
const { toSansBoldItalic, randomFooter, ownerOnlyDenied } = require('../lib/menu-styles');
const { setAntideleteStatus, setAntideleteSendTo, setAntideleteGlobalStatus, setAntideleteGlobalSendTo } = require('../data/Antidelete');
const { setAntieditStatus, setAntieditSendTo, setAntieditGlobalStatus, setAntieditGlobalSendTo } = require('../data/Antiedit');

const B = toSansBoldItalic;
const FOOTER = () => `\n\n> ${randomFooter()}`;

// ============================================================================
// ANTI-DELETE COMMANDS
// ============================================================================

cmd({
    pattern: "antidelete",
    alias: ["antidel"],
    desc: "Toggle Anti-Delete for this chat or globally",
    category: "recovery",
    react: "♻️"
}, async (conn, mek, m, { args, from, reply, isOwner, botNumber }) => {
    if (!isOwner) return reply(ownerOnlyDenied() + FOOTER());
    
    const action = args[0]?.toLowerCase();
    if (action === 'on') {
        await setAntideleteStatus(botNumber, from, true);
        return reply(`✅ *${B('𝘼𝙣𝙩𝙞-𝘿𝙚𝙡𝙚𝙩𝙚 𝙊𝙉')}* for this chat.` + FOOTER());
    } else if (action === 'off') {
        await setAntideleteStatus(botNumber, from, false);
        return reply(`❌ *${B('𝘼𝙣𝙩𝙞-𝘿𝙚𝙡𝙚𝙩𝙚 𝙊𝙁𝙁')}* for this chat.` + FOOTER());
    } else if (action === 'all') {
        const sub = args[1]?.toLowerCase();
        if (sub === 'on') {
            await setAntideleteGlobalStatus(botNumber, true);
            return reply(`🚀 *${B('𝘼𝙣𝙩𝙞-𝘿𝙚𝙡𝙚𝙩𝙚 𝙀𝙣𝙖𝙗𝙡𝙚𝙙 𝙂𝙡𝙤𝙗𝙖𝙡𝙡𝙮')}* for all chats!` + FOOTER());
        } else if (sub === 'off') {
            await setAntideleteGlobalStatus(botNumber, false);
            return reply(`🛑 *${B('𝘼𝙣𝙩𝙞-𝘿𝙚𝙡𝙚𝙩𝙚 𝘿𝙞𝙨𝙖𝙗𝙡𝙚𝙙 𝙂𝙡𝙤𝙗𝙖𝙡𝙡𝙮')}*.` + FOOTER());
        }
    }
    
    reply(`╭━━━ ♻️ ${B('𝘼𝙉𝙏𝙄-𝘿𝙀𝙇𝙀𝙏𝙀')} ━━━╮\n┃ ⚙️ ${B('Usage')}:\n┃ 🔹 .antidelete on/off\n┃ 🔹 .antidelete all on/off\n╰━━━━━━━━━━━━━━━━━━╯` + FOOTER());
});

cmd({
    pattern: "delpath",
    desc: "Set where deleted messages are recovered",
    category: "recovery",
    react: "📥"
}, async (conn, mek, m, { args, from, reply, isOwner, botNumber }) => {
    if (!isOwner) return reply(ownerOnlyDenied() + FOOTER());
    
    const path = args[0]?.toLowerCase();
    if (path === 'private' || path === 'dm') {
        await setAntideleteSendTo(botNumber, from, 'private');
        return reply(`✅ *${B('𝘿𝙚𝙡𝙚𝙩𝙚-𝙥𝙖𝙩𝙝 𝙨𝙚𝙩 𝙩𝙤')}:* ${B('Your Private Chat')} 📥 for this chat.` + FOOTER());
    } else if (path === 'same' || path === 'here') {
        await setAntideleteSendTo(botNumber, from, 'same');
        return reply(`✅ *${B('𝘿𝙚𝙡𝙚𝙩𝙚-𝙥𝙖𝙩𝙝 𝙨𝙚𝙩 𝙩𝙤')}:* ${B('This Chat')} 📍.` + FOOTER());
    } else if (path === 'all') {
        const sub = args[1]?.toLowerCase();
        if (sub === 'private') {
            await setAntideleteGlobalSendTo(botNumber, 'private');
            return reply(`🚀 *${B('𝙂𝙡𝙤𝙗𝙖𝙡 𝘿𝙚𝙡𝙚𝙩𝙚-𝙥𝙖𝙩𝙝')}* set to ${B('Private Chat')} for ALL recoveries.` + FOOTER());
        } else if (sub === 'same') {
            await setAntideleteGlobalSendTo(botNumber, 'same');
            return reply(`🚀 *${B('𝙂𝙡𝙤𝙗𝙖𝙡 𝘿𝙚𝙡𝙚𝙩𝙚-𝙥𝙖𝙩𝙝')}* set to ${B('Same Chat')} for ALL recoveries.` + FOOTER());
        }
    }
    
    reply(`╭━━━ 📥 ${B('𝘿𝙀𝙇𝙀𝙏𝙀-𝙋𝘼𝙏𝙃')} ━━━╮\n┃ ⚙️ ${B('Usage')}:\n┃ 🔹 .delpath private/same\n┃ 🔹 .delpath all private/same\n╰━━━━━━━━━━━━━━━━━━╯` + FOOTER());
});

// ============================================================================
// ANTI-EDIT COMMANDS
// ============================================================================

cmd({
    pattern: "antiedit",
    desc: "Toggle Anti-Edit for this chat or globally",
    category: "recovery",
    react: "📝"
}, async (conn, mek, m, { args, from, reply, isOwner, botNumber }) => {
    if (!isOwner) return reply(ownerOnlyDenied() + FOOTER());
    
    const action = args[0]?.toLowerCase();
    if (action === 'on') {
        await setAntieditStatus(botNumber, from, true);
        return reply(`✅ *${B('𝘼𝙣𝙩𝙞-𝙀𝙙𝙞𝙩 𝙊𝙉')}* for this chat.` + FOOTER());
    } else if (action === 'off') {
        await setAntieditStatus(botNumber, from, false);
        return reply(`❌ *${B('𝘼𝙣𝙩𝙞-𝙀𝙙𝙞𝙩 𝙊𝙁𝙁')}* for this chat.` + FOOTER());
    } else if (action === 'all') {
        const sub = args[1]?.toLowerCase();
        if (sub === 'on') {
            await setAntieditGlobalStatus(botNumber, true);
            return reply(`🚀 *${B('𝘼𝙣𝙩𝙞-𝙀𝙙𝙞𝙩 𝙀𝙣𝙖𝙗𝙡𝙚𝙙 𝙂𝙡𝙤𝙗𝙖𝙡𝙡𝙮')}* for all chats!` + FOOTER());
        } else if (sub === 'off') {
            await setAntieditGlobalStatus(botNumber, false);
            return reply(`🛑 *${B('𝘼𝙣𝙩𝙞-𝙀𝙙𝙞𝙩 𝘿𝙞𝙨𝙖𝙗𝙡𝙚𝙙 𝙂𝙡𝙤𝙗𝙖𝙡𝙡𝙮')}*.` + FOOTER());
        }
    }
    
    reply(`╭━━━ 📝 ${B('𝘼𝙉𝙏𝙄-𝙀𝘿𝙄𝙏')} ━━━╮\n┃ ⚙️ ${B('Usage')}:\n┃ 🔹 .antiedit on/off\n┃ 🔹 .antiedit all on/off\n╰━━━━━━━━━━━━━━━━━━╯` + FOOTER());
});

cmd({
    pattern: "editpath",
    desc: "Set where edited messages are reported",
    category: "recovery",
    react: "📥"
}, async (conn, mek, m, { args, from, reply, isOwner, botNumber }) => {
    if (!isOwner) return reply(ownerOnlyDenied() + FOOTER());
    
    const path = args[0]?.toLowerCase();
    if (path === 'private' || path === 'dm') {
        await setAntieditSendTo(botNumber, from, 'private');
        return reply(`✅ *${B('𝙀𝙙𝙞𝙩-𝙥𝙖𝙩𝙝 𝙨𝙚𝙩 𝙩𝙤')}:* ${B('Your Private Chat')} 📥 for this chat.` + FOOTER());
    } else if (path === 'same' || path === 'here') {
        await setAntieditSendTo(botNumber, from, 'same');
        return reply(`✅ *${B('𝙀𝙙𝙞𝙩-𝙥𝙖𝙩𝙝 𝙨𝙚𝙩 𝙩𝙤')}:* ${B('This Chat')} 📍.` + FOOTER());
    } else if (path === 'all') {
        const sub = args[1]?.toLowerCase();
        if (sub === 'private') {
            await setAntieditGlobalSendTo(botNumber, 'private');
            return reply(`🚀 *${B('𝙂𝙡𝙤𝙗𝙖𝙡 𝙀𝙙𝙞𝙩-𝙥𝙖𝙩𝙝')}* set to ${B('Private Chat')} for ALL reports.` + FOOTER());
        } else if (sub === 'same') {
            await setAntieditGlobalSendTo(botNumber, 'same');
            return reply(`🚀 *${B('𝙂𝙡𝙤𝙗𝙖𝙡 𝙀𝙙𝙞𝙩-𝙥𝙖𝙩𝙝')}* set to ${B('Same Chat')} for ALL reports.` + FOOTER());
        }
    }
    
    reply(`╭━━━ 📥 ${B('𝙀𝘿𝙄𝙏-𝙋𝘼𝙏𝙃')} ━━━╮\n┃ ⚙️ ${B('Usage')}:\n┃ 🔹 .editpath private/same\n┃ 🔹 .editpath all private/same\n╰━━━━━━━━━━━━━━━━━━╯` + FOOTER());
});
