const sharp = require('sharp');
const { classifyImage, modelStatus } = require('../lib/nsfw-shield');

(async () => {
  const fixture = await sharp({ create: { width: 224, height: 224, channels: 3, background: { r: 20, g: 10, b: 35 } } }).png().toBuffer();
  const result = await classifyImage(fixture);
  if (!result || !result.scores || !Array.isArray(result.predictions)) throw new Error('Classifier returned an invalid result');
  console.log(JSON.stringify({ ok: true, predictions: result.predictions, status: modelStatus() }));
})().catch((error) => {
  console.error(error?.stack || error);
  process.exit(1);
});
