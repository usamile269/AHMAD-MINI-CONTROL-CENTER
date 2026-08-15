// ============================================================================
// lib/text-style.js — simple, big/bold reply text for every command
// ----------------------------------------------------------------------------
// 🚨 CHANGE (Ahmad requested "simple fonts, results big"): the old version
// replaced every letter with a Mathematical Bold Unicode character. That
// font is inconsistent across phones/fonts, breaks copy-paste and search,
// and stacked badly with the small-caps font already used in menu/settings
// text. Switched to WhatsApp's own bold markdown (*text*) instead — it's
// plain, normal text underneath (simple), but WhatsApp renders it bold/
// heavier so results still stand out and look "big".
//
// Rather than editing 40+ plugin files individually, this still hooks into
// the ONE shared `reply()` function in main.js that virtually every command
// already calls, so it's applied bot-wide from a single place.
//
// Lines that are already formatted (start with *, >, ```, or box-drawing
// characters like │╭╰┃) are left untouched so nothing gets double-wrapped
// or broken.
// ============================================================================

// 🆕 (Ahmad: "all bot inteructions yehii kar do fonts may overall")
// Mathematical Sans-Serif Bold Italic mapping (𝙎𝘼𝙍𝙒𝘼𝙍 style).
const boldMap = {
    A:'𝘼',B:'𝘽',C:'𝘾',D:'𝘿',E:'𝙀',F:'𝙁',G:'𝙂',H:'𝙃',I:'𝙄',J:'𝙅',K:'𝙆',L:'𝙇',M:'𝙈',
    N:'𝙉',O:'𝙊',P:'𝙋',Q:'𝙌',R:'𝙍',S:'𝙎',T:'𝙏',U:'𝙐',V:'𝙑',W:'𝙒',X:'𝙓',Y:'𝙔',Z:'𝙕',
    a:'𝙖',b:'𝙗',c:'𝙘',d:'𝙙',e:'𝙚',f:'𝙛',g:'𝙜',h:'𝙝',i:'𝙞',j:'𝙟',k:'𝙠',l:'𝙡',m:'𝙢',
    n:'𝙣',o:'𝙤',p:'𝙥',q:'𝙦',r:'𝙧',s:'𝙨',t:'𝙩',u:'𝙪',v:'𝙫',w:'𝙬',x:'𝙭',y:'𝙮',z:'𝙯',
    0:'𝟬',1:'𝟭',2:'𝟮',3:'𝟯',4:'𝟰',5:'𝟱',6:'𝟲',7:'𝟳',8:'𝟴',9:'𝟵'
};

// Kept for backwards compatibility with any code that still wants the old
// unicode-bold behaviour for a single word/string.
function boldWord(word) {
    return word.split('').map(ch => boldMap[ch] || ch).join('');
}

const ALREADY_FORMATTED = /^[*>`│┃║┆┇╎╏╭╮╰╯┏┓┗┛╔╗╚╝\-─━═]/;

// 🚨 CHANGE (Bunty: "bot may ** yeh fazool hai / SAB perfect ho ab" —
// wrapping every single reply line in *asterisks* bot-wide was exactly
// the clutter being complained about, on top of plugins that already
// wrap dynamic bold spans themselves). No longer auto-wraps anything —
// text is sent through untouched, so only intentional formatting
// (unicode-bold via toSansBold/toFancy, or explicit *text* a plugin
// still wants) shows up, nothing extra.
// 🚨 FEATURE (requested by Ahmad — "all bot inteructions yehii kar do fonts may overall"):
// Automatically applies the luxury Bold Sans Italic font to all command replies.
// Skips lines that look like links, emojis, or already contain special formatting
// to avoid breaking URLs or double-encoding.
function toFancyBold(text) {
    if (!text || typeof text !== 'string') return text;
    return text.split('\n').map(line => {
        // Skip formatting for lines that are:
        // 1. Just symbols/box-drawing (preserve UI boxes)
        // 2. URLs (avoid breaking links)
        // 3. Already contain the special Unicode characters (avoid double-wrap)
        if (ALREADY_FORMATTED.test(line) || line.includes('http://') || line.includes('https://')) {
            return line;
        }
        return line.split('').map(ch => boldMap[ch] || ch).join('');
    }).join('\n');
}

module.exports = { toFancyBold, boldWord, boldMap };
