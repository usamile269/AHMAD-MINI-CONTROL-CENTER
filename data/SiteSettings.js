const jsondb = require('../lib/mongo');

// Single row, always keyed 'site'. Stored locally via jsondb — no MongoDB.
const SiteSettings = jsondb.model('SiteSettings');
const KEY = 'site';

const DEFAULTS = {
    botName: 'AHMAD-MINI',
    welcomeMsg: "Connected Successfully — you're all set!",
    welcomeVideo: '',
    channelLink: '',
    bgMusicUrl: '',
    heroTagline: 'WhatsApp Pairing',
    heroBrightness: 135,
    voiceUrl: 'https://files.manuscdn.com/user_upload_by_module/session_file/310519663847350286/XfJiIPNnVCaSmlUI.wav',
    musicUrl: 'https://files.manuscdn.com/user_upload_by_module/session_file/310519663847350286/PQgvMfuaAVQVVQHT.mp3',
    voiceVolume: 200,
    musicVolume: 60,
    bgVideoUrl: '',
    bgImageUrl: '',
    leavesEnabled: false,
    primaryColor: '#ff69b4',
    accentColor: '#da70d6',
    youtubeLink: '',
    githubLink: '',
    instagramLink: '',
    audioPopupEnabled: false
};

async function getSiteSettings() {
    try {
        const doc = await SiteSettings.findOne({ key: KEY });
        return doc ? { ...DEFAULTS, ...doc.data } : { ...DEFAULTS };
    } catch (e) {
        return { ...DEFAULTS };
    }
}

async function setSiteSettings(update) {
    try {
        const current = await getSiteSettings();
        const merged = { ...current, ...update };
        await SiteSettings.findOneAndUpdate({ key: KEY }, { data: merged }, { upsert: true });
        return merged;
    } catch (e) {
        console.error('❌ Error saving site settings:', e.message);
        return null;
    }
}

module.exports = { getSiteSettings, setSiteSettings, DEFAULTS };
