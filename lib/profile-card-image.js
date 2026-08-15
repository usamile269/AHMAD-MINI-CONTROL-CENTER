// lib/profile-card-image.js — lightweight premium profile card renderer.
// Uses SVG + sharp so Railway does not need a browser or a heavy canvas stack.
// ============================================================================

const sharp = require('sharp');

function escapeXml(value) {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
}

function clampText(value, max = 28) {
    const text = String(value ?? '').replace(/\s+/g, ' ').trim();
    return text.length > max ? `${text.slice(0, Math.max(1, max - 1))}…` : text;
}

function initials(name, number) {
    const words = String(name || '').trim().split(/\s+/).filter(Boolean);
    const letters = words.length > 1 ? words.slice(0, 2).map(word => word[0]) : String(words[0] || number || 'M').slice(0, 2);
    return letters.join('').toUpperCase();
}

function photoHref(photoBuffer, contentType = 'image/jpeg') {
    if (!photoBuffer || !Buffer.isBuffer(photoBuffer) || photoBuffer.length < 100) return null;
    return `data:${contentType};base64,${photoBuffer.toString('base64')}`;
}

async function renderProfileImageCard({
    name,
    number,
    bio,
    groupName,
    role,
    level = '01',
    rank = 'CYBER-PINK MEMBER',
    photoBuffer,
    photoContentType = 'image/jpeg'
}) {
    const safeName = escapeXml(clampText(name || number || 'Unknown User', 22));
    const safeNumber = escapeXml(`+${String(number || '').replace(/[^0-9]/g, '')}`);
    const safeBio = escapeXml(clampText(bio || 'No public bio available', 32));
    const safeGroup = escapeXml(clampText(groupName || 'Private Chat', 24));
    const safeRole = escapeXml(clampText(role || 'Member', 16).toUpperCase());
    const safeLevel = escapeXml(String(level));
    const safeRank = escapeXml(clampText(rank, 24));
    const fallbackInitials = escapeXml(initials(name, number));

    // WhatsApp profile-photo URLs can return JPEG, WebP, or an expired/error
    // payload. Normalize only the small avatar to PNG; if decoding fails, the
    // card remains valid and uses the initials fallback instead of failing.
    let normalizedPhoto = null;
    if (photoBuffer && Buffer.isBuffer(photoBuffer) && photoBuffer.length >= 100) {
        try {
            normalizedPhoto = await sharp(photoBuffer)
                .resize(196, 196, { fit: 'cover', position: 'centre' })
                .png()
                .toBuffer();
        } catch (error) {
            console.warn('[PROFILE CARD] unsupported profile photo, using initials:', error.message);
        }
    }
    const photo = photoHref(normalizedPhoto, 'image/png');

    const photoMarkup = photo
        ? `<image href="${photo}" x="72" y="112" width="196" height="196" preserveAspectRatio="xMidYMid slice" clip-path="url(#avatarClip)"/>`
        : `<circle cx="170" cy="210" r="98" fill="#1b0d1b" stroke="#ff4db8" stroke-width="4"/>
           <text x="170" y="228" text-anchor="middle" fill="#ffd8ef" font-size="58" font-family="DejaVu Sans, sans-serif" font-style="italic" font-weight="800">${fallbackInitials}</text>`;

    const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="900" height="560" viewBox="0 0 900 560">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#09070d"/>
      <stop offset="58%" stop-color="#160d20"/>
      <stop offset="100%" stop-color="#06251d"/>
    </linearGradient>
    <linearGradient id="line" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#ff4db8"/>
      <stop offset="50%" stop-color="#ffd2ef"/>
      <stop offset="100%" stop-color="#24e6a2"/>
    </linearGradient>
    <radialGradient id="glowPink" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#ff3eae" stop-opacity="0.40"/>
      <stop offset="100%" stop-color="#ff3eae" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="glowGreen" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#1be7a0" stop-opacity="0.28"/>
      <stop offset="100%" stop-color="#1be7a0" stop-opacity="0"/>
    </radialGradient>
    <clipPath id="avatarClip"><circle cx="170" cy="210" r="96"/></clipPath>
    <filter id="softShadow" x="-30%" y="-30%" width="160%" height="160%">
      <feGaussianBlur stdDeviation="12"/>
    </filter>
  </defs>

  <rect width="900" height="560" rx="34" fill="url(#bg)"/>
  <circle cx="120" cy="110" r="230" fill="url(#glowPink)" filter="url(#softShadow)"/>
  <circle cx="820" cy="480" r="250" fill="url(#glowGreen)" filter="url(#softShadow)"/>
  <path d="M36 72 H864" stroke="url(#line)" stroke-width="2" opacity="0.85"/>
  <path d="M36 488 H864" stroke="url(#line)" stroke-width="2" opacity="0.55"/>
  <rect x="34" y="34" width="832" height="492" rx="28" fill="none" stroke="#ffffff" stroke-opacity="0.13"/>

  <text x="72" y="78" fill="#ffd9ef" font-size="24" letter-spacing="5" font-family="DejaVu Sans, sans-serif" font-style="italic" font-weight="800">AHMAD MINI</text>
  <text x="864" y="78" text-anchor="end" fill="#6ff2c1" font-size="18" letter-spacing="3" font-family="DejaVu Sans, sans-serif" font-style="italic" font-weight="800">PROFILE ID</text>

  <circle cx="170" cy="210" r="108" fill="none" stroke="#ff4db8" stroke-opacity="0.25" stroke-width="11"/>
  <circle cx="170" cy="210" r="101" fill="none" stroke="#24e6a2" stroke-opacity="0.85" stroke-width="3"/>
  ${photoMarkup}

  <text x="330" y="150" fill="#ffffff" font-size="38" font-family="DejaVu Sans, sans-serif" font-style="italic" font-weight="800">${safeName}</text>
  <text x="330" y="188" fill="#ff8dcc" font-size="21" letter-spacing="2" font-family="DejaVu Sans, sans-serif" font-style="italic" font-weight="800">${safeNumber}</text>
  <text x="330" y="232" fill="#a8ffe0" font-size="19" letter-spacing="2" font-family="DejaVu Sans, sans-serif" font-style="italic" font-weight="800">${safeRank}</text>

  <rect x="330" y="266" width="236" height="84" rx="18" fill="#ffffff" fill-opacity="0.06" stroke="#ff4db8" stroke-opacity="0.65"/>
  <text x="354" y="297" fill="#ffacd8" font-size="15" letter-spacing="2" font-family="DejaVu Sans, sans-serif" font-style="italic" font-weight="800">LEVEL</text>
  <text x="354" y="333" fill="#ffffff" font-size="30" font-family="DejaVu Sans, sans-serif" font-style="italic" font-weight="800">${safeLevel}</text>

  <rect x="586" y="266" width="236" height="84" rx="18" fill="#ffffff" fill-opacity="0.06" stroke="#24e6a2" stroke-opacity="0.65"/>
  <text x="610" y="297" fill="#8ff6d0" font-size="15" letter-spacing="2" font-family="DejaVu Sans, sans-serif" font-style="italic" font-weight="800">ROLE</text>
  <text x="610" y="333" fill="#ffffff" font-size="25" font-family="DejaVu Sans, sans-serif" font-style="italic" font-weight="800">${safeRole}</text>

  <text x="72" y="406" fill="#ffb5dd" font-size="16" letter-spacing="2" font-family="DejaVu Sans, sans-serif" font-style="italic" font-weight="800">ABOUT</text>
  <text x="72" y="438" fill="#ffffff" font-size="22" font-family="DejaVu Sans, sans-serif" font-style="italic" font-weight="800">${safeBio}</text>
  <text x="72" y="478" fill="#91f8d1" font-size="17" font-family="DejaVu Sans, sans-serif" font-style="italic" font-weight="800">${safeGroup}</text>
  <text x="828" y="478" text-anchor="end" fill="#ffd9ef" font-size="16" letter-spacing="2" font-family="DejaVu Sans, sans-serif" font-style="italic" font-weight="800">ACTIVE • VERIFIED CARD</text>
</svg>`;

    return sharp(Buffer.from(svg)).png().toBuffer();
}

async function renderRankCard({
    name,
    number,
    xp,
    level,
    coins,
    rank,
    photoBuffer
}) {
    const safeName = escapeXml(clampText(name || number || 'Unknown User', 22));
    const safeNumber = escapeXml(`+${String(number || '').replace(/[^0-9]/g, '')}`);
    const safeRank = escapeXml(clampText(rank, 24));
    const safeLevel = escapeXml(String(level));
    const safeCoins = escapeXml(Number(coins || 0).toLocaleString());
    const xpInLevel = xp % 1000;
    const progress = Math.min(100, Math.max(5, (xpInLevel / 1000) * 100));
    const progressBarWidth = 500;
    const currentProgressWidth = (progress / 100) * progressBarWidth;
    const fallbackInitials = escapeXml(initials(name, number));

    let normalizedPhoto = null;
    if (photoBuffer && Buffer.isBuffer(photoBuffer) && photoBuffer.length >= 100) {
        try {
            normalizedPhoto = await sharp(photoBuffer)
                .resize(180, 180, { fit: 'cover', position: 'centre' })
                .png()
                .toBuffer();
        } catch (error) {}
    }
    const photo = photoHref(normalizedPhoto, 'image/png');

    const photoMarkup = photo
        ? `<image href="${photo}" x="80" y="140" width="180" height="180" clip-path="url(#rankAvatarClip)"/>`
        : `<circle cx="170" cy="230" r="90" fill="#1b0d1b" stroke="#ff4db8" stroke-width="4"/>
           <text x="170" y="250" text-anchor="middle" fill="#ffd8ef" font-size="52" font-family="DejaVu Sans, sans-serif" font-style="italic" font-weight="800">${fallbackInitials}</text>`;

    const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="900" height="500" viewBox="0 0 900 500">
  <defs>
    <linearGradient id="rankBg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#0a050e"/>
      <stop offset="100%" stop-color="#1c0b2b"/>
    </linearGradient>
    <linearGradient id="barGradient" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#ff4db8"/>
      <stop offset="100%" stop-color="#24e6a2"/>
    </linearGradient>
    <clipPath id="rankAvatarClip"><circle cx="170" cy="230" r="90"/></clipPath>
    <filter id="glow"><feGaussianBlur stdDeviation="8" result="blur"/><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
  </defs>

  <rect width="900" height="500" rx="30" fill="url(#rankBg)"/>
  <rect x="20" y="20" width="860" height="460" rx="25" fill="none" stroke="#ff4db8" stroke-opacity="0.2" stroke-width="2"/>

  <text x="50" y="65" fill="#ffb7df" font-size="22" letter-spacing="4" font-family="DejaVu Sans, sans-serif" font-style="italic" font-weight="800">AHMAD MINI • RANK CARD</text>
  
  <circle cx="170" cy="230" r="100" fill="none" stroke="url(#barGradient)" stroke-width="4" stroke-opacity="0.6"/>
  ${photoMarkup}

  <text x="320" y="160" fill="#ffffff" font-size="42" font-family="DejaVu Sans, sans-serif" font-style="italic" font-weight="800">${safeName}</text>
  <text x="320" y="205" fill="#a8ffe0" font-size="24" letter-spacing="2" font-family="DejaVu Sans, sans-serif" font-style="italic" font-weight="800">${safeRank}</text>

  <text x="320" y="280" fill="#ffacd8" font-size="18" letter-spacing="2" font-family="DejaVu Sans, sans-serif" font-style="italic" font-weight="800">LEVEL ${safeLevel}</text>
  <text x="820" y="280" text-anchor="end" fill="#8ff6d0" font-size="18" letter-spacing="2" font-family="DejaVu Sans, sans-serif" font-style="italic" font-weight="800">${xpInLevel} / 1000 XP</text>
  
  <rect x="320" y="300" width="${progressBarWidth}" height="14" rx="7" fill="#ffffff" fill-opacity="0.1"/>
  <rect x="320" y="300" width="${currentProgressWidth}" height="14" rx="7" fill="url(#barGradient)" filter="url(#glow)"/>

  <rect x="320" y="360" width="220" height="70" rx="15" fill="#ffffff" fill-opacity="0.05" stroke="#ff4db8" stroke-opacity="0.4"/>
  <text x="340" y="388" fill="#ffacd8" font-size="14" letter-spacing="2" font-family="DejaVu Sans, sans-serif" font-style="italic" font-weight="800">COINS</text>
  <text x="340" y="418" fill="#ffffff" font-size="24" font-family="DejaVu Sans, sans-serif" font-style="italic" font-weight="800">${safeCoins}</text>

  <text x="820" y="440" text-anchor="end" fill="#ffb7df" font-size="14" letter-spacing="2" font-family="DejaVu Sans, sans-serif" font-style="italic" font-weight="800">LUXE ECONOMY SYSTEM</text>
</svg>`;

    return sharp(Buffer.from(svg)).png().toBuffer();
}

module.exports = { renderProfileImageCard, renderRankCard };
