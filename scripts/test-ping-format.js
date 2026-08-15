const { commandMap } = require('../ahmad-core');
require('../plugins/ping');

(async () => {
  const ping = commandMap.get('ping');
  if (!ping) throw new Error('ping command was not registered');

  const sent = [];
  const conn = {
    async sendMessage(chat, payload) { sent.push({ chat, payload }); },
    async sendPresenceUpdate() {}
  };
  const mek = { key: { remoteJid: 'test@s.whatsapp.net', id: 'ping-test' } };
  const m = { key: mek.key };
  await ping.function(conn, mek, m, {
    from: mek.key.remoteJid,
    reply: async () => {},
    arrivalTs: Date.now(),
    arrivalNs: process.hrtime.bigint()
  });
  const text = sent.find((x) => typeof x.payload?.text === 'string')?.payload?.text || '';
  if (!text.includes('𝙍𝙀𝙎𝙋𝙊𝙉𝙎𝙀')) throw new Error('Response row missing');
  if (!text.includes('> ')) throw new Error('Quoted footer missing');
  if (text.includes('> > ')) throw new Error('Duplicate quoted footer');
  if (!text.includes('™ 𝑨𝑯𝑴𝑨𝑫')) throw new Error('Header branding missing');
  if (text.includes('™ ™')) throw new Error('Duplicate trademark remains');
  const statLines = text.split('\n').filter((line) => /STATUS|RESPONSE|SPEED|PROCESS|UPTIME/.test(line));
  if (statLines.some((line) => /🩷|💚/.test(line.slice(line.indexOf('➤'))))) throw new Error('Trailing value emojis remain');
  console.log(JSON.stringify({ ok: true, text }));
})().catch((error) => {
  console.error(error?.stack || error);
  process.exit(1);
});
