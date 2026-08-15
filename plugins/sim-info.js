const { cmd } = require('../ahmad-core');
const { renderCard, toSansBold, toSansBoldItalic, toBoldItalicSerif, randomFooter } = require('../lib/menu-styles');
const { offloadTask } = require('../lib/queue');

cmd({
    pattern: "sim",
    alias: ["numberinfo", "siminfo"],
    desc: "Get SIM owner details & total registered SIMs",
    category: "tools",
    use: ".sim 0324xxxxxxx",
    react: "🕵️"
}, async (conn, mek, m, { args, reply }) => {
    try {
        let input = args.join("");
        if (!input) return reply(`❌ *Please provide a number!*\n💡 Usage: .sim 03249560618\n\n${randomFooter()}`);

        let number = input.replace(/[^0-9]/g, '');
        if (number.startsWith('92')) number = '0' + number.slice(2);
        if (!number.startsWith('0') && number.length === 10) number = '0' + number;

        await conn.sendMessage(m.chat, { react: { text: '🔍', key: m.key } });

        let records = null;
        let totalCount = 0;
        let errorMsg = "No record found in database";

        try {
            const workerRes = await offloadTask('sim.resolve', { number });
            if (workerRes?.success && workerRes?.records) {
                records = workerRes.records;
                totalCount = workerRes.count || records.length;
            } else {
                errorMsg = workerRes?.error || "No record found in database";
            }
        } catch (e) {
            errorMsg = e.message;
        }

        const label = v => toSansBoldItalic(v);
        const val = v => toSansBoldItalic(String(v ?? 'N/A'));

        if (records && records.length > 0) {
            const primary = records[0];
            
            // 🚀 LUXURY UI (requested by Ahmad: "pink cyber recovery line, luxury aesthetic")
            let bodyText = `🕵️ *${label('𝙎𝙄𝙈 𝙄𝙣𝙛𝙤𝙧𝙢𝙖𝙩𝙞𝙤𝙣 𝙁𝙤𝙪𝙣𝙙')}*\n` +
                             `◆──────────────────\n` +
                             `▍ 👤 *${label('𝙉𝙖𝙢𝙚')}:* ${val(primary.name || primary.full_name)}\n` +
                             `▍ 🆔 *${label('𝘾𝙉𝙄𝘾')}:* ${val(primary.cnic || primary.id_card)}\n` +
                             `▍ 📱 *${label('𝙉𝙪𝙢𝙗𝙚𝙧')}:* ${val(primary.mobile || primary.number || number)}\n` +
                             `▍ 📊 *${label('𝙏𝙤𝙩𝙖𝙡 𝙎𝙄𝙈𝙨')}:* ${val(totalCount + ' SIMs Found')}\n` +
                             `▍ 📡 *${label('𝙉𝙚𝙩𝙬𝙤𝙧𝙠')}:* ${val(primary.network || primary.operator)}\n` +
                             `▍ 🏠 *${label('𝘼𝙙𝙙𝙧𝙚𝙨𝙨')}:* ${val(primary.address || primary.location)}\n` +
                             `◆──────────────────`;

            if (records.length > 1) {
                bodyText += `\n\n🔗 *${label('𝘼𝙨𝙨𝙤𝙘𝙞𝙖𝙩𝙚𝙙 𝙉𝙪𝙢𝙗𝙚𝙧𝙨')}:*\n`;
                records.slice(1, 8).forEach((r, idx) => {
                    bodyText += `▫️ ${val(r.mobile)} (${val(r.network || 'Unknown')})\n`;
                });
                if (records.length > 8) {
                    bodyText += `▫️ ...and ${records.length - 8} more\n`;
                }
            }
            
            const aestheticMsg = bodyText + `\n\n${randomFooter()}`;

            await conn.sendMessage(m.chat, { text: aestheticMsg }, { quoted: mek });
            await conn.sendMessage(m.chat, { react: { text: '✅', key: m.key } });
        } else {
            const errorCard = `❌ *${label('𝙎𝙄𝙈 𝘿𝙚𝙩𝙖𝙞𝙡𝙨 𝙉𝙤𝙩 𝙁𝙤𝙪𝙣𝙙')}*\n` +
                             `◆──────────────────\n` +
                             `▍ 📱 *${label('𝙉𝙪𝙢𝙗𝙚𝙧')}:* ${val(number)}\n` +
                             `▍ ⚠️ *${label('𝙍𝙚𝙖𝙨𝙤𝙣')}:* ${val(errorMsg)}\n` +
                             `◆──────────────────\n\n` +
                             `${randomFooter()}`;
            reply(errorCard);
            await conn.sendMessage(m.chat, { react: { text: '❌', key: m.key } });
        }

    } catch (e) {
        console.error('[SIM ERROR]', e);
        reply(`❌ *API Error:* ${e.message}\n\n${randomFooter()}`);
    }
});
