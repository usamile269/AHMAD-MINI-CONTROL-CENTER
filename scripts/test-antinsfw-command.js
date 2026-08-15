const { commandMap } = require('../ahmad-core');
const { getGroupSettings } = require('../data/GroupSettings');

(async () => {
  require('../plugins/group-extra');
  const command = commandMap.get('antinsfw');
  if (!command) throw new Error('antinsfw command was not registered');
  for (const alias of ['nsfwshield', 'adultshield', 'nsfwguard']) {
    if (commandMap.get(alias) !== command) throw new Error(`Alias ${alias} was not registered`);
  }
  const settings = await getGroupSettings('antinsfw-test@g.us');
  if (settings.antinsfw !== false) throw new Error('Anti-NSFW must default to OFF');
  if (settings.antinsfwThreshold !== 0.82 || settings.antinsfwAction !== 'kick') throw new Error('Unexpected Anti-NSFW defaults');
  console.log(JSON.stringify({ ok: true, aliases: ['nsfwshield', 'adultshield', 'nsfwguard'], defaults: { enabled: settings.antinsfw, threshold: settings.antinsfwThreshold, action: settings.antinsfwAction } }));
})().catch((error) => {
  console.error(error?.stack || error);
  process.exit(1);
});
