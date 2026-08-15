const { cmd } = require('../ahmad-core');
const { toSansBoldItalic, randomFooter } = require('../lib/menu-styles');
const config = require('../config');
const os = require('os');
const lastNetworkProbeMs = new WeakMap();

// 🎨 REDESIGN (Bunty: "channel forward style mein hai hi nahi 🫠"): the
// previous version only attached the channel-forward contextInfo to the
// throwaway "calculating..." placeholder message — the SECOND call (the
// one that actually `edit`s the message into its final, visible form) had
// no contextInfo at all, so the forward badge silently disappeared the
// moment the edit landed. Rewritten to never edit at all: the network-send
// timing is measured with a cheap, invisible presence-update probe first,
// then ONE single real message is sent with the full result AND the full
// channel-forward context attached from the very start — nothing to lose
// on a second call.
const channelContext = {
    forwardingScore: 999,
    isForwarded: true,
    forwardedNewsletterMessageInfo: {
        newsletterJid: config.CHANNEL_JID || "120363407376142647@newsletter",
        newsletterName: config.BOT_NAME,
        serverMessageId: 2,
    },
};

cmd({
  pattern: "ping",
  desc: "⚡ Check bot speed",
  category: "main",
  react: "⚡",
  filename: __filename
}, async (conn, mek, m, { from, reply, arrivalTs, arrivalNs }) => {

  try {
    // `arrivalNs` is captured at the moment Baileys emits the message batch.
    // Use a monotonic high-resolution clock so the display is not a rounded or
    // artificially clamped value. Fallback to Date.now for older callers.
    const processMs = arrivalNs
      ? Number(process.hrtime.bigint() - arrivalNs) / 1e6
      : Math.max(0, Date.now() - (arrivalTs || Date.now()));

    // Use the most recent real presence round-trip without making the visible
    // .ping response wait for a second WhatsApp request. The next probe runs
    // in the background and becomes the value shown on the next .ping.
    const networkMs = lastNetworkProbeMs.get(conn) || null;
    void (async () => {
      const sendStartNs = process.hrtime.bigint();
      try {
        await conn.sendPresenceUpdate('available', from);
        lastNetworkProbeMs.set(conn, Number(process.hrtime.bigint() - sendStartNs) / 1e6);
      } catch (_) {}
    })();
    const fmtMs = value => value == null ? '—' : (value < 10 ? value.toFixed(1) : String(Math.round(value)));

    const uptimeSec = process.uptime();
    const uh = Math.floor(uptimeSec / 3600);
    const um = Math.floor((uptimeSec % 3600) / 60);
    const us = Math.floor(uptimeSec % 60);
    const uptimeStr = `${uh}h ${um}m ${us}s`;

    const botName = (config.BOT_NAME || 'AHMAD MINI').replace(/^™\s*/, '');
    const B = toSansBoldItalic;

    // 🎨 REDESIGN (Bunty: ".ping ni sahi cmd response, usay luxury attractive
    // karo, fonts same hi hon but sab khoob attractive") — same Sans Bold
    // Italic font kept as-is, only the frame around it upgraded: thick
    // double-line ornate border instead of the plain single-line box, a
    // crown/gem header instead of a flat bracket title, and gold-diamond
    // bullets (◈) per stat row for a heavier "luxury dark gold" look.
    const { toSansBold } = require('../lib/menu-styles');
    const NB = toSansBold; // Extra Bold for numbers
    const text = `╭◆──「 ◆✦ ™ ${B(botName)} ${B('𝙋𝙄𝙉𝙂')} ✦◆ 」──◆╮\n` +
        `┃\n` +
        `┃  🌸 ${B('𝙎𝙏𝘼𝙏𝙐𝙎')}   ➤ ${B('ONLINE')}\n` +
        `┃  🟢 ${B('𝙍𝙀𝙎𝙋𝙊𝙉𝙎𝙀')} ➤ ${B('Pong!')}\n` +
        `┃  🎀 ${B('𝙎𝙋𝙀𝙀𝘿')}    ➤ ${NB(fmtMs(networkMs))} ${B('ms')}\n` +
        `┃  🍀 ${B('𝙋𝙍𝙊𝘾𝙀𝙎𝙎')}  ➤ ${NB(fmtMs(processMs))} ${B('ms')}\n` +
        `┃  🍭 ${B('𝙐𝙋𝙏𝙄𝙈𝙀')}   ➤ ${NB(String(uh))}𝙝 ${NB(String(um))}𝙢 ${NB(String(us))}𝙨\n` +
        `┃\n` +
        `╰◆──────────────────────◆╯\n` +
        `${randomFooter()}`;

    const resultReaction = "⚡";

    await conn.sendMessage(from, {
      text,
      contextInfo: channelContext
    }, { quoted: mek });

    await conn.sendMessage(from, {
      react: { text: resultReaction, key: m.key }
    });

  } catch (e) {
    console.error(e);
    await conn.sendMessage(from, {
      react: { text: "❌", key: m.key }
    });
    reply("❌ *Failed!*");
  }
});
