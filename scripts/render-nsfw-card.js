const fs = require('fs');
const { buildNsfwBanCard } = require('../lib/nsfw-ban-card');

(async () => {
  const card = await buildNsfwBanCard({ groupName: 'Cyber-Pink Lounge', userTag: 'member_123', score: 0.93, action: 'KICK' });
  fs.writeFileSync('/home/ubuntu/mini-final-work/nsfw-ban-card-fixture.png', card);
  console.log('wrote nsfw-ban-card-fixture.png');
})().catch((error) => {
  console.error(error?.stack || error);
  process.exit(1);
});
