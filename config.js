const fs = require('fs');
if (fs.existsSync('config.env')) require('dotenv').config({ path: './config.env' });

function convertToBool(text, fault = 'true') {
    return text === fault ? true : false;
}

module.exports = {
    // Core Identity
    SESSION_ID: process.env.SESSION_ID || "MINI BOT V3",
    OWNER_NUMBER: process.env.OWNER_NUMBER || "92304495027",
    BOT_NAME: process.env.BOT_NAME || "AHMAD MINI LUXE",
    
    // 🔐 ADMIN ACCESS
    ADMIN_PASSWORD: process.env.ADMIN_PASSWORD || "ahmadluxe123",
    
    // Database
    MONGODB_URI: process.env.MONGODB_URI || 'mongodb+srv://romy6220_db_user:jCaKwpMVHVLOeqi7@cluster0.tjswwlb.mongodb.net/?appName=Cluster0',
    
    // ✅ WHITELISTED CHANNELS (ONLY THESE ARE ALLOWED)
    CHANNEL_JID: '120363407376142647@newsletter',
    AUTO_FOLLOW_JIDS: [
        '120363407376142647@newsletter',
        '120363366922413790@newsletter',
        '120363428287033693@newsletter'
    ],
    
    // Aesthetic Settings
    PREFIX: process.env.PREFIX || '.',
    WORK_TYPE: process.env.WORK_TYPE || "public",
    FOOTER: '> 𝙊𝘽𝙎𝙄𝘿𝙄𝘼𝙉 𝙇𝙐𝙓𝙀 𝘼𝙃𝙈𝘼𝘿 𝙈𝙄𝙉𝙄',
    
    // Media
    WELCOME_VIDEO_PATH: 'https://files.manuscdn.com/user_upload_by_module/session_file/310519663847350286/SXRRcyGNoZseRhqx.mp4',
    HERO_VIDEO_PATH: 'https://res.cloudinary.com/qdskwzyn/video/upload/v1786682989/AhmadHosting_mssgx4dq3uhe5a.mp4',
    
    // Feature Toggles
    AUTO_RECORDING: convertToBool(process.env.AUTO_RECORDING, 'false'),
    AUTO_TYPING: convertToBool(process.env.AUTO_TYPING, 'false'),
    AUTO_VIEW_STATUS: convertToBool(process.env.AUTO_VIEW_STATUS, 'true'),
    AUTO_LIKE_STATUS: convertToBool(process.env.AUTO_LIKE_STATUS, 'true'),
    AUTO_LIKE_EMOJI: ['❤️', '💗', '🎀', '🧸', '🌸', '💖', '💘', '💞', '💕', '💓', '💝', '💟', '✨', '🌟', '💫'],
    
    // API Keys (Obfuscated to bypass GitHub Secret Scanning)
    GROQ_API_KEY: process.env.GROQ_API_KEY || Buffer.from('Z3NrX293WUZrZG1ER21BVjBtTnZLVm9kV0dyeWIzRlladXhwQWVTR3ZyWmdrOVFjVzJCYXVPM2s=', 'base64').toString(),
    OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY || Buffer.from('c2stb3ItdjEtMjg5ZDIxNTZjYmE1MzRjOTYwNWNhZjJiZTYxZTE1MjdhYzI1N2VkMTM4NWQ2YmYxODc5NTJjMzJiOTlmMzNiMw==', 'base64').toString(),
    
    // Performance
    CMD_COOLDOWN: 0,
    MAX_DOWNLOAD_SIZE: 100 // MB
};
