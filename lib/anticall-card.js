const sharp = require('sharp');

function escapeXml(value) {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
}

async function renderAntiCallCard({ callerNumber }) {
    const safeNumber = escapeXml(`+${String(callerNumber || '').replace(/[^0-9]/g, '')}`);
    
    const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="800" height="400" viewBox="0 0 800 400">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#0a0610"/>
      <stop offset="50%" stop-color="#140a1d"/>
      <stop offset="100%" stop-color="#051a14"/>
    </linearGradient>
    <linearGradient id="borderGrad" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#ff1493"/>
      <stop offset="100%" stop-color="#00ffcc"/>
    </linearGradient>
    <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="12" result="blur"/>
      <feComposite in="SourceGraphic" in2="blur" operator="over"/>
    </filter>
  </defs>

  <!-- Background -->
  <rect width="800" height="400" rx="36" fill="url(#bg)"/>
  
  <!-- Decorative Glows -->
  <circle cx="100" cy="100" r="150" fill="#ff1493" fill-opacity="0.12" filter="url(#glow)"/>
  <circle cx="700" cy="300" r="180" fill="#00ffcc" fill-opacity="0.08" filter="url(#glow)"/>

  <!-- Luxury Borders -->
  <rect x="25" y="25" width="750" height="350" rx="28" fill="none" stroke="url(#borderGrad)" stroke-width="2.5" stroke-opacity="0.4"/>
  <rect x="35" y="35" width="730" height="330" rx="22" fill="none" stroke="#ffffff" stroke-width="0.5" stroke-opacity="0.15"/>
  
  <!-- Anti-Call Symbol -->
  <g transform="translate(400, 95)">
    <circle r="48" fill="#ff1493" fill-opacity="0.1"/>
    <circle r="40" fill="none" stroke="#ff1493" stroke-width="3" filter="url(#glow)"/>
    <line x1="-22" y1="-22" x2="22" y2="22" stroke="#ff1493" stroke-width="6" stroke-linecap="round"/>
    <line x1="22" y1="-22" x2="-22" y2="22" stroke="#ff1493" stroke-width="6" stroke-linecap="round"/>
  </g>

  <!-- Main Text -->
  <text x="400" y="195" text-anchor="middle" fill="#ffffff" font-size="42" font-family="DejaVu Sans, sans-serif" font-style="italic" font-weight="800" letter-spacing="3" filter="url(#glow)">ANTI-CALL SHIELD</text>
  
  <text x="400" y="245" text-anchor="middle" fill="#ffacd8" font-size="24" font-family="DejaVu Sans, sans-serif" font-style="italic" font-weight="700" letter-spacing="1">CALLS ARE DISABLED IN THIS TERRITORY</text>
  
  <!-- Divider -->
  <path d="M280 275 H520" stroke="url(#borderGrad)" stroke-width="2" stroke-opacity="0.6" stroke-linecap="round"/>
  
  <!-- Caller Info -->
  <text x="400" y="315" text-anchor="middle" fill="#ffffff" font-size="20" font-family="DejaVu Sans, sans-serif" font-style="italic" font-weight="700" opacity="0.9">CALLER: ${safeNumber}</text>
  
  <!-- Branding -->
  <text x="400" y="360" text-anchor="middle" fill="#00ffcc" font-size="16" font-family="DejaVu Sans, sans-serif" font-style="italic" font-weight="800" letter-spacing="5">AHMAD MINI • LUXURY EDITION</text>
</svg>`;

    return sharp(Buffer.from(svg)).png().toBuffer();
}

module.exports = { renderAntiCallCard };
