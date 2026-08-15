const { getGroupSettings } = require('../data/GroupSettings');
const { status: redisStatus } = require('../lib/redis-cache');

(async () => {
  const settings = await getGroupSettings('test@g.us');
  if (settings.antiflood !== false) throw new Error('Quantum Shield must default to OFF');
  if (settings.antifloodLimit !== 6 || settings.antifloodWindowSec !== 10) throw new Error('Unexpected shield defaults');
  console.log(JSON.stringify({ ok: true, shield: { enabled: settings.antiflood, limit: settings.antifloodLimit, windowSec: settings.antifloodWindowSec }, redis: redisStatus() }));
})().catch((error) => {
  console.error(error?.stack || error);
  process.exit(1);
});
