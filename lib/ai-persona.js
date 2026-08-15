// ============================================================================
// lib/ai-persona.js — shared identity/persona layer for every .ai/.gpt/etc
// command in the bot.
// ----------------------------------------------------------------------------
// Requested by Bunty: "koi puchay Ahmad x Bunty ya Ahmad ya Bunty to batain
// mere baray mein number ke sath" + "har language use karein" (reply in
// whatever language the person asked in).
//
// Free/unauthenticated AI proxy APIs (the ones this bot currently uses for
// .gpt/.ai/.deepseek/.gemini) don't reliably follow instructions buried
// inside a single prompt string — asking them to "always mention Bunty's
// number when asked about him" is not something you can depend on. So the
// identity question is answered DETERMINISTICALLY here — detected by
// keyword match, answered directly, without ever calling an external AI —
// guaranteed correct every time, instead of hoping a random free model
// cooperates. Every other (non-identity) question still goes to the AI as
// normal, just with a light language-matching instruction added.
// ============================================================================

const config = require('../config');

const BOT_NAME_PATTERNS = [
    /\b(?:what(?:'s| is)\s+your|your)\s+(?:name|naam)\b/i,
    /\b(?:who\s+are\s+you|what\s+should\s+i\s+call\s+you)\b/i,
    /\b(?:tera|tumhara|aapka|apna|aap\s+ka)\s+(?:naam|nam|name)\s+(?:kya|kia)\b/i,
    /\b(?:naam|nam|name)\s+(?:kya|kia)\s+(?:hai|he)\b/i,
    /(?:تمہارا|آپ کا|اپنا)\s*نام\s*(?:کیا|کیا ہے|ہے)/u,
];

const IDENTITY_PATTERNS = [
    /\bahmad\s*[x×]\s*bunty\b/i,
    /\bbunty\s*[x×]\s*ahmad\b/i,
    /\bwho\s+(is|are)\s+(ahmad|bunty)\b/i,
    /\bkaun\s+(hai|hain)\s+(ahmad|bunty)\b/i,
    /\b(ahmad|bunty)\s+kaun\s+(hai|hain)\b/i,
    /\btum(hara|hare)?\s+(owner|malik|banane\s*wala|creator)\s+(kaun|kon)\b/i,
    /\bwho\s+(made|created|built|owns?)\s+you\b/i,
    /\byour\s+(owner|creator|developer|maker)\b/i,
    /\bapna\s+owner\s+bata/i,
    /\bmujhe\s+ahmad\s+ke\s+baray?\s+mein\s+bata/i,
    /\btell\s+me\s+about\s+(ahmad|bunty)\b/i,
];

function looksLikeBotNameQuestion(text) {
    if (!text) return false;
    return BOT_NAME_PATTERNS.some(re => re.test(text));
}

function looksLikeIdentityQuestion(text) {
    if (!text) return false;
    return looksLikeBotNameQuestion(text) || IDENTITY_PATTERNS.some(re => re.test(text));
}

// Very rough script/language detector — just enough to pick which of the 3
// pre-written answers to use. Not linguistically rigorous on purpose: a
// simple, predictable heuristic beats a fragile "smart" one here.
function detectLanguageStyle(text) {
    if (/[\u0600-\u06FF]/.test(text)) return 'urdu'; // Urdu/Arabic script present
    // crude Roman-Urdu signal: common Roman-Urdu words/particles
    if (/\b(hai+|hain|han+|jee|ji|g|kya+|kia+|kaun|ni|nahi+|acha+|yarr+|yar+|kuch|khuch|samajh|aaya|aya|kar|karni|karli|kardi|raha|rahi|mein|kaise|kaisay)\b/i.test(text)) return 'roman-urdu';
    return 'english';
}

// Best-effort language-matching instruction for GENERAL (non-identity)
// questions — prepended into the prompt sent to the AI. Free proxy APIs
// don't always obey this perfectly, but it noticeably helps most of the
// time, and costs nothing when it doesn't.
function identityAnswer(text) {
    const style = detectLanguageStyle(text);
    if (looksLikeBotNameQuestion(text)) {
        if (style === 'urdu') return 'میرا نام احمد منی ہے، آپ کا نام کیا ہے؟';
        if (style === 'roman-urdu') return 'Mera naam Ahmad Mini hai, tumhara naam kya hai?';
        return 'I’m Ahmad Mini. What should I call you?';
    }

    const { toSansBoldItalic } = require('./menu-styles');
    const B = toSansBoldItalic;
    const number = config.OWNER_NUMBER || "923044975027";
    const botName = config.BOT_NAME || "™ 𝑨𝑯𝑴𝑨𝑫 𝑴𝑰𝑵𝙄 ᥫᩣ";
    const name = B("𝘽𝙪𝙣𝙩𝙮 𝘼𝙝𝙢𝙖𝙙");

    const styles = [
        // Style 1: The Visionary Mastermind
        `╭━━━〔 👑 ${B('𝙏𝙝𝙚 𝙈𝙖𝙨𝙩𝙚𝙧𝙢𝙞𝙣𝙙')} 〕━━━╮\n` +
        `┃\n` +
        `┃ 👤 ${B('𝙉𝙖𝙢𝙚')}   : ${name}\n` +
        `┃ 🛠️ ${B('𝙍𝙤𝙡𝙚')}   : ${B('𝙇𝙚𝙜𝙚𝙣𝙙𝙖𝙧𝙮 𝘿𝙚𝙫𝙚𝙡𝙤𝙥𝙚𝙧')}\n` +
        `┃ 📱 ${B('𝘾𝙤𝙣𝙩𝙖𝙘𝙩')} : +${number}\n` +
        `┃\n` +
        `┃ ✨ ${B('𝘼𝙝𝙢𝙖𝙙 𝙞𝙨 𝙩𝙝𝙚 𝙫𝙞𝙨𝙞𝙤𝙣𝙖𝙧𝙮 𝙗𝙚𝙝𝙞𝙣𝙙')}\n` +
        `┃ ${B('𝙩𝙝𝙞𝙨 𝙢𝙖𝙨𝙩𝙚𝙧𝙥𝙞𝙚𝙘𝙚. 𝙀𝙫𝙚𝙧𝙮 𝙡𝙞𝙣𝙚 𝙤𝙛')}\n` +
        `┃ ${B('𝙘𝙤𝙙𝙚 𝙞𝙨 𝙗𝙪𝙞𝙡𝙩 𝙬𝙞𝙩𝙝 𝙥𝙪𝙧𝙚 𝙨𝙠𝙞𝙡𝙡.')}\n` +
        `┃\n` +
        `╰━━━━━━━━━━━━━━━━━━━━━━╯`,

        // Style 2: The Sigma Elite
        `⚡ ${name} ⚡\n` +
        `(${B('𝙏𝙝𝙚 𝙊𝙣𝙚 𝙒𝙝𝙤 𝘾𝙤𝙣𝙩𝙧𝙤𝙡𝙨 𝙏𝙝𝙚 𝙂𝙖𝙢𝙚')})\n\n` +
        `👑 ${B('𝙊𝙬𝙣𝙚𝙧 & 𝘾𝙧𝙚𝙖𝙩𝙤𝙧 𝙤')}f ${botName}.\n` +
        `💀 ${B('𝙉𝙤 𝙇𝙞𝙢𝙞𝙩𝙨. 𝙉𝙤 𝙒𝙚𝙖𝙠𝙣𝙚𝙨𝙨. 𝙅𝙪𝙨𝙩 𝙀𝙡𝙞𝙩𝙚 𝘾𝙤𝙙𝙞𝙣𝙜.')}\n` +
        `📱 ${B('𝘾𝙤𝙣𝙩𝙖𝙘𝙩 𝙩𝙝𝙚 𝙇𝙚𝙜𝙚𝙣𝙙')}: +${number}\n\n` +
        `🔥 ${B('𝘽𝙪𝙞𝙡𝙩 𝙬𝙞𝙩𝙝 𝙥𝙪𝙧𝙚 𝙥𝙖𝙨𝙨𝙞𝙤𝙣 𝙖𝙣𝙙 𝙚𝙡𝙞𝙩𝙚')}\n` +
        `${B('𝙨𝙠𝙞𝙡𝙡𝙨. 𝙏𝙝𝙚 𝙪𝙡𝙩𝙞𝙢𝙖𝙩𝙚 𝙒𝙝𝙖𝙩𝙨𝘼𝙥𝙥 𝘽𝙤𝙩!')}`,

        // Style 3: The Luxury Aesthetic
        `🌸 ${name} 🌸\n` +
        `✨ ${B('𝙊𝘽𝙎𝙄𝘿𝙄𝘼𝙉 𝙇𝙐𝙓𝙀 𝙁𝙊𝙐𝙉𝘿𝙀𝙍')} ✨\n\n` +
        `💎 ${B('𝘼𝙝𝙢𝙖𝙙 𝙞𝙨 𝙩𝙝𝙚 𝙝𝙚𝙖𝙧𝙩 𝙤𝙛 𝙩𝙝𝙞𝙨 𝙗𝙤𝙩.')}\n` +
        `🎀 ${B('𝙇𝙪𝙭𝙪𝙧𝙮 𝘿𝙚𝙨𝙞𝙜𝙣. 𝙍𝙤𝙘𝙠𝙚𝙩 𝙎𝙥𝙚𝙚𝙙.')}\n` +
        `🪐 ${B('𝘽𝙪𝙞𝙡𝙩 𝙗𝙮 𝙩𝙝𝙚 𝙗𝙚𝙨𝙩, 𝙛𝙤𝙧 𝙩𝙝𝙚 𝙗𝙚𝙨𝙩.')}\n\n` +
        `📱 ${B('𝘿𝙈 𝙩𝙝𝙚 𝙊𝙬𝙣𝙚𝙧')}: +${number}`
    ];

    return styles[Math.floor(Math.random() * styles.length)];
}

function withLanguageMatch(userText) {
    return `Reply in the SAME language and script the user is writing in (English, Roman Urdu, or Urdu script — match theirs exactly). Give only the final answer, not an analysis or translation. Do not repeat or quote the user's message, do not offer alternatives/options, do not begin with filler such as Haha/Hmm unless it genuinely fits, and do not wrap the answer in quotation marks. Be clear, helpful, and naturally concise unless detail is genuinely needed. User's message: ${userText}`;
}

function normalizeForEchoCheck(value) {
    return String(value || '')
        .toLowerCase()
        .replace(/[\"“”‘’'`]/g, '')
        .replace(/[^\p{L}\p{N}]+/gu, ' ')
        .trim();
}

function isUnsafeAutoReply(text) {
    const normalized = normalizeForEchoCheck(text);
    if (!normalized) return false;
    return /\b(?:abey|abe|bakwaas|chup|nikal|dafaa|dafa|pagal|bewaqoof|gadha|gadhi|saale|harami|bhosd|chod|fuck|fucking|shit|bitch|idiot|stupid)\b/i.test(normalized);
}

function isGenericAutoReply(text) {
    const normalized = normalizeForEchoCheck(text);
    if (!normalized) return true;
    const genericPatterns = [
        /^(?:haan|han|yes)\s+(?:abhi bhi\s+)?(?:kar sakte hain|kar sakte ho|karenge)$/,
        /^(?:sab\s+)?chal raha hai(?:\s+sab)?$/,
        /^(?:haan|han)\s+(?:chalo\s+)?(?:karein|karen|kar lete hain)$/,
        /^(?:next|continue|aglay|aagay|aage)$/,
        /^(?:acha|achha)\s+samajh\s+gaya$/,
        /^(?:theek|thik)\s+hai\s+bolo$/,
        /^(?:acha|achha)\s+bolo$/,
        /^got it$/,
        /^(?:koi baat nahi|no problem)\s+(?:batao|tell me).*$/
    ];
    return genericPatterns.some(pattern => pattern.test(normalized));
}

function cleanHumanAutoReply(answer, userText, history = []) {
    let text = String(answer || '').trim();
    if (!text) return '';

    // Models occasionally send the recipient's words back in quotes, followed
    // by a translated suggestion or a second option. Auto-replies must contain
    // only one send-ready WhatsApp message.
    text = text
        .replace(/[\"“”‘’]/g, '')
        .replace(/\s*\((?:or|ya|or if you prefer|if you prefer|alternative|option|translation|meaning|what'?s going on|how are you|what'?s up)\b[^)]*\)/gi, '')
        .replace(/(?:^|\n)\s*(?:or|alternative|option)\b[^\n]*/gim, '')
        .replace(/(?:^|\n)\s*(?:translation|meaning)\s*:\s*[^\n]*/gim, '')
        .replace(/\s{2,}/g, ' ')
        .trim();

    const style = detectLanguageStyle(userText);
    if (style === 'roman-urdu') {
        text = text
            .replace(/\b(?:what'?s up|what is going on|how are you|if you prefer)\??/gi, '')
            .replace(/\s{2,}/g, ' ')
            .trim();
    }

    const source = normalizeForEchoCheck(userText);
    const response = normalizeForEchoCheck(text);
    const shortAcknowledgement = /^(?:han|haan|ha|g|ji|jee|ok|okay|yes|yeah|yep)\b/i.test(source);
    const isEcho = source && response && (
        response === source ||
        (response.startsWith(source) && response.length <= source.length + 18) ||
        (shortAcknowledgement && response.startsWith(source))
    );
    const previousReplies = new Set((history || [])
        .filter(turn => !turn?.role || turn.role === 'assistant')
        .map(turn => normalizeForEchoCheck(turn?.text ?? turn?.a))
        .filter(Boolean));
    const repeatsPreviousReply = response && previousReplies.has(response);
    if (isEcho || isUnsafeAutoReply(text) || isGenericAutoReply(text) || repeatsPreviousReply || !text) return '';
    return text;
}

module.exports = {
    looksLikeIdentityQuestion,
    looksLikeBotNameQuestion,
    identityAnswer,
    withLanguageMatch,
    detectLanguageStyle,
    cleanHumanAutoReply,
    isUnsafeAutoReply,
    isGenericAutoReply
};
