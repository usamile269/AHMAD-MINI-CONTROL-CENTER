'use strict';

const config = require('../config');
let tf = require('@tensorflow/tfjs');
let backend = 'cpu';
try {
    require('@tensorflow/tfjs-node');
    tf = require('@tensorflow/tfjs');
    if (tf.findBackend('tensorflow')) {
        tf.setBackend('tensorflow');
        backend = 'tensorflow';
    }
} catch (_) {
    // Railway images without the native TensorFlow binary continue safely on
    // the pure-JS CPU backend instead of disabling the shield.
}
const nsfwjs = require('nsfwjs');
const sharp = require('sharp');

let modelPromise = null;
const MODEL_INPUT_SIZE = 224;
const MAX_IMAGE_BYTES = 12 * 1024 * 1024;

function loadModel() {
    if (!modelPromise) {
        modelPromise = nsfwjs.load(undefined, { size: MODEL_INPUT_SIZE })
            .catch((error) => {
                modelPromise = null;
                throw error;
            });
    }
    return modelPromise;
}

function predictionMap(predictions) {
    return Object.fromEntries((predictions || []).map((item) => [String(item.className).toLowerCase(), Number(item.probability) || 0]));
}

async function classifyImage(buffer) {
    if (String(config.NSFW_MODEL_ENABLED ?? 'true') === 'false') throw new Error('NSFW model disabled by configuration');
    if (!Buffer.isBuffer(buffer) || buffer.length === 0) throw new Error('empty image');
    if (buffer.length > MAX_IMAGE_BYTES) throw new Error('image exceeds moderation size limit');

    const { data, info } = await sharp(buffer, { failOn: 'none' })
        .rotate()
        .resize(MODEL_INPUT_SIZE, MODEL_INPUT_SIZE, { fit: 'cover' })
        .removeAlpha()
        .raw()
        .toBuffer({ resolveWithObject: true });

    const input = tf.tensor3d(new Uint8Array(data), [info.height, info.width, info.channels], 'int32');
    try {
        const model = await loadModel();
        const predictions = await model.classify(input);
        const scores = predictionMap(predictions);
        const explicitScore = Math.max(scores.porn || 0, scores.hentai || 0);
        const suggestiveScore = Math.max(explicitScore, scores.sexy || 0);
        return {
            scores,
            explicitScore,
            suggestiveScore,
            predictions
        };
    } finally {
        input.dispose();
    }
}

function isViolation(result, threshold = 0.82) {
    const limit = Math.min(0.99, Math.max(0.5, Number(threshold) || 0.82));
    const porn = result?.scores?.porn || 0;
    const hentai = result?.scores?.hentai || 0;
    const sexy = result?.scores?.sexy || 0;
    return porn >= limit || hentai >= limit || (sexy >= Math.min(0.95, limit + 0.08) && (porn + hentai) >= 0.15);
}

function modelStatus() {
    return { loaded: Boolean(modelPromise), backend, inputSize: MODEL_INPUT_SIZE, maxImageBytes: MAX_IMAGE_BYTES };
}

module.exports = { classifyImage, isViolation, modelStatus };
