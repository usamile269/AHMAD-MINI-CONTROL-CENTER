// ============================================================================
// lib/card-styles.js — shared "attractive card" text layout used by welcome,
// goodbye, and profile commands. Kept as plain styled text (bordered box +
// bold-serif + emoji) rather than a canvas-rendered image, since this repo
// has no image/canvas library installed — adding one (e.g. @napi-rs/canvas)
// risks breaking installs on free hosts (Railway/KataBump/Render free tiers
// sometimes fail native-module builds). The member's actual profile photo
// is still attached as the message image, so it looks like a real "card"
// even though the box itself is text.
// ============================================================================

// 🔧 Bunty: "footer to wohi hai all file may footer yeh karo" — use the
// same shared footer pool (now just the 2 luxury footers) everywhere,
// instead of each card having its own hardcoded footer text.
const { randomFooter } = require('./menu-styles');

const BOLD_SERIF_MAP = {
    A:'𝑨',B:'𝑩',C:'𝑪',D:'𝑫',E:'𝑬',F:'𝑭',G:'𝑮',H:'𝑯',I:'𝑰',J:'𝑱',K:'𝑲',L:'𝑳',M:'𝑴',
    N:'𝑵',O:'𝑶',P:'𝑷',Q:'𝑸',R:'𝑹',S:'𝑺',T:'𝑻',U:'𝑼',V:'𝑽',W:'𝑾',X:'𝑿',Y:'𝒀',Z:'𝒁',
    a:'𝒂',b:'𝒃',c:'𝒄',d:'𝒅',e:'𝒆',f:'𝒇',g:'𝒈',h:'𝒉',i:'𝒊',j:'𝒋',k:'𝒌',l:'𝒍',m:'𝒎',
    n:'𝒏',o:'𝒐',p:'𝒑',q:'𝒒',r:'𝒓',s:'𝒔',t:'𝒕',u:'𝒖',v:'𝒗',w:'𝒘',x:'𝒙',y:'𝒚',z:'𝒛',
};
function bs(str) { return String(str).split('').map(c => BOLD_SERIF_MAP[c] || c).join(''); }

function renderWelcomeCard({ mention, groupName, memberCount, botName }) {
    return (
        `╭━━〔 🎉 ${bs('WELCOME')} 〕━━┈⊷\n` +
        `┃\n` +
        `┃ 👤 ${mention}\n` +
        `┃ ✨ ${bs('Welcome to')} ${bs(groupName)}\n` +
        `┃ 👥 ${bs('Members')}: ${bs(String(memberCount))}\n` +
        `┃ 💫 ${bs('Enjoy your stay!')}\n` +
        `┃\n` +
        `╰━━━━━━━━━━━━━━━┈⊷\n` +
        `${randomFooter()}`
    );
}

const attitudeKickQuotes = [
    "𝐀𝐡𝐦𝐚𝐝 𝐘𝐨𝐮𝐫 𝐃𝐚𝐝 𝐊𝐢𝐜𝐤𝐞𝐝 𝐘𝐨𝐮 𝐎𝐮𝐭...",
    "𝐃𝐨𝐧'𝐭 𝐌𝐞𝐬𝐬 𝐖𝐢𝐭𝐡 𝐭𝐡𝐞 𝐀𝐝𝐦𝐢𝐧𝐬!",
    "𝐎𝐮𝐭 𝐨𝐟 𝐒𝐢𝐠𝐡𝐭, 𝐎𝐮𝐭 𝐨𝐟 𝐌𝐢𝐧𝐝...",
    "𝐑𝐮𝐥𝐞𝐬 𝐀𝐫𝐞 𝐑𝐮𝐥𝐞𝐬, 𝐆𝐨𝐨𝐝𝐛𝐲𝐞...",
    "𝐀𝐧𝐨𝐭𝐡𝐞𝐫 𝐎𝐧𝐞 𝐁𝐢𝐭𝐞𝐬 𝐭𝐡𝐞 𝐃𝐮𝐬𝐭!"
];

function renderKickCard({ mention, groupName, memberCount }) {
    const randomQuote = attitudeKickQuotes[Math.floor(Math.random() * attitudeKickQuotes.length)];
    return (
        `╭━━〔 👢 ${bs('REMOVED')} 〕━━┈⊷\n` +
        `┃\n` +
        `┃ 👤 ${mention}\n` +
        `┃ ⚡ ${bs('Was kicked from')} ${bs(groupName)}\n` +
        `┃ 👥 ${bs('Remaining')}: ${bs(String(memberCount))}\n` +
        `┃ 💀 _${randomQuote}_\n` +
        `┃\n` +
        `╰━━━━━━━━━━━━━━━┈⊷\n` +
        `${randomFooter()}`
    );
}

function renderGoodbyeCard({ mention, groupName, memberCount }) {
    return (
        `╭━━〔 👋 ${bs('GOODBYE')} 〕━━┈⊷\n` +
        `┃\n` +
        `┃ 👤 ${mention}\n` +
        `┃ 🚪 ${bs('Has left')} ${bs(groupName)}\n` +
        `┃ 👥 ${bs('Remaining')}: ${bs(String(memberCount))}\n` +
        `┃ 🍃 ${bs('We will miss you!')}\n` +
        `┃\n` +
        `╰━━━━━━━━━━━━━━━┈⊷\n` +
        `${randomFooter()}`
    );
}

function renderProfileCard({ name, number, bio, isAdmin, groupName }) {
    let card =
        `╭─❖ ${bs('PROFILE')} ❖─╮\n` +
        `┃\n` +
        `┃ 👤 ${bs('Name')}   : ${name}\n` +
        `┃ 🔢 ${bs('Number')} : +${number}\n`;
    if (bio) card += `┃ 📝 ${bs('About')}  : ${bio}\n`;
    if (groupName) card += `┃ 👥 ${bs('Group')}  : ${groupName}\n`;
    if (typeof isAdmin === 'boolean') card += `┃ 🛡️ ${bs('Role')}   : ${isAdmin ? 'Admin' : 'Member'}\n`;
    card +=
        `┃\n` +
        `╰──────────────╯\n` +
        `${randomFooter()}`;
    return card;
}

module.exports = { renderWelcomeCard, renderGoodbyeCard, renderProfileCard };
