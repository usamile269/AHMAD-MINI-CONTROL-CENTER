const { buildNsfwBanCard } = require('../lib/nsfw-ban-card');
const { isViolation, modelStatus } = require('../lib/nsfw-shield');

(async () => {
  const card = await buildNsfwBanCard({ groupName: 'Test Group', userTag: 'member', score: 0.93, action: 'KICK' });
  if (!Buffer.isBuffer(card) || card.length < 1000) throw new Error('Card renderer did not produce a usable PNG');
  if (!isViolation({ scores: { porn: 0.91, hentai: 0, sexy: 0 } }, 0.82)) throw new Error('Explicit score was not blocked');
  if (isViolation({ scores: { porn: 0.2, hentai: 0.1, sexy: 0.4 } }, 0.82)) throw new Error('Low-risk score was incorrectly blocked');
  console.log(JSON.stringify({ ok: true, cardBytes: card.length, model: modelStatus() }));
})().catch((error) => {
  console.error(error?.stack || error);
  process.exit(1);
});
