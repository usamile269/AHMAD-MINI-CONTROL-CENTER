const fs = require('fs');
const path = require('path');
const { EdgeTTS } = require('edge-tts-universal');

(async () => {
  const text = 'Welcome to Ahmad Mini. This is a neural voice test.';
  const tts = new EdgeTTS(text, 'en-US-AriaNeural', { rate: '+0%', volume: '+0%', pitch: '+0Hz' });
  const result = await tts.synthesize();
  const out = path.join('/tmp', 'ahmad-edge-tts-test.mp3');
  fs.writeFileSync(out, Buffer.from(await result.audio.arrayBuffer()));
  console.log(JSON.stringify({ out, bytes: fs.statSync(out).size }));
})().catch((error) => {
  console.error(error?.stack || error);
  process.exit(1);
});
