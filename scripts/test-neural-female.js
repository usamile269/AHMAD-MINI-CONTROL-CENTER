const { neuralFemaleVoice } = require('../plugins/funny-voices');

(async () => {
  const sent = [];
  const conn = {
    async sendMessage(chat, payload) {
      sent.push({ chat, type: payload.audio ? 'audio' : payload.react ? 'react' : 'other', bytes: payload.audio?.length || 0 });
    }
  };
  await neuralFemaleVoice(conn, 'test@s.whatsapp.net', { key: { id: 'test-message' } }, 'Welcome to Ahmad Mini. This is a natural female neural voice test.');
  const audio = sent.find((entry) => entry.type === 'audio');
  if (!audio || audio.bytes < 1000) throw new Error('No usable voice-note payload was produced');
  console.log(JSON.stringify({ ok: true, sent, audioBytes: audio.bytes }));
})().catch((error) => {
  console.error(error?.stack || error);
  process.exit(1);
});
