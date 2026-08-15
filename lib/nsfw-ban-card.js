'use strict';

const sharp = require('sharp');

function esc(value) {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
}

async function buildNsfwBanCard({ groupName = 'Group', userTag = 'member', score = 0, action = 'KICK' } = {}) {
    const scoreText = `${Math.round(Math.max(0, Math.min(1, Number(score) || 0)) * 100)}%`;
    const svg = `<svg width="1200" height="630" viewBox="0 0 1200 630" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stop-color="#09050e"/>
          <stop offset="0.52" stop-color="#180b25"/>
          <stop offset="1" stop-color="#3b0e39"/>
        </linearGradient>
        <linearGradient id="pink" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stop-color="#ff4fa3"/>
          <stop offset="1" stop-color="#ffb7df"/>
        </linearGradient>
        <filter id="glow"><feGaussianBlur stdDeviation="10" result="blur"/><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
      </defs>
      <rect width="1200" height="630" rx="44" fill="url(#bg)"/>
      <circle cx="1050" cy="75" r="210" fill="#ff3b9d" opacity="0.12" filter="url(#glow)"/>
      <circle cx="150" cy="560" r="250" fill="#8b2cff" opacity="0.14" filter="url(#glow)"/>
      <rect x="30" y="30" width="1140" height="570" rx="34" fill="none" stroke="url(#pink)" stroke-width="3" opacity="0.9"/>
      <text x="80" y="112" fill="#ffb7df" font-family="Arial, sans-serif" font-size="28" font-weight="700" letter-spacing="5">AHMAD MINI  •  OBSIDIAN LUXE</text>
      <text x="80" y="215" fill="#ffffff" font-family="Arial, sans-serif" font-size="72" font-weight="900">CONTENT SHIELD</text>
      <text x="80" y="278" fill="#ff76bd" font-family="Arial, sans-serif" font-size="42" font-weight="800">EXPLICIT CONTENT BLOCKED</text>
      <line x1="82" y1="320" x2="1118" y2="320" stroke="#ff4fa3" stroke-width="2" opacity="0.7"/>
      <text x="82" y="380" fill="#fbe7f4" font-family="Arial, sans-serif" font-size="28">Offender: <tspan fill="#ff9fd0" font-weight="700">@${esc(userTag)}</tspan></text>
      <text x="82" y="426" fill="#fbe7f4" font-family="Arial, sans-serif" font-size="28">Detection Confidence: <tspan fill="#ff9fd0" font-weight="700">${esc(scoreText)}</tspan></text>
      <text x="82" y="472" fill="#fbe7f4" font-family="Arial, sans-serif" font-size="28">Status: <tspan fill="#ff4fa3" font-weight="700">INSTANTLY REMOVED</tspan></text>
      <text x="82" y="540" fill="#ffb7df" font-family="Arial, sans-serif" font-size="20" font-weight="600">Zero tolerance in this luxury domain. Repeat offenders will be instantly banned.</text>
      <text x="1118" y="552" text-anchor="end" fill="#ffb7df" font-family="Arial, sans-serif" font-size="20" font-weight="700">${esc(groupName).slice(0, 32)}</text>
    </svg>`;
    return sharp(Buffer.from(svg)).png({ quality: 92 }).toBuffer();
}

module.exports = { buildNsfwBanCard };
