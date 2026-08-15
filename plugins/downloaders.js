const { cmd } = require('../ahmad-core');
const axios = require('axios');
const yts = require('yt-search');
const config = require('../config');
const { fakevCard } = require('../lib/fakevCard');
const { randomFooter, toSansBold, toSansBoldItalic } = require('../lib/menu-styles');

const AXIOS_OPTS = {
    timeout: 15000,
    headers: { 
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
        'Accept': 'application/json, text/plain, */*'
    }
};

function dlBox(title, lines, emoji = '⬇️') {
    return `╭═══ ${emoji} ${toSansBold(title)} ═══⊷\n┃❃╭──────────────\n${lines.map(l=>`┃❃│ ${toSansBold(l)}`).join('\n')}\n┃❃╰───────────────\n╰═════════════════⊷\n\n${randomFooter()}`;
}

function usageBox(command, type = 'media') {
    const B = toSansBoldItalic;
    const NB = toSansBold;
    return `╭━━━〔 ✧ ${B('AHMAD MINI')} ✧ 〕━━━╮\n` +
           `┃ 𖹭 ${B('Error')} : ${NB('Input Missing')}\n` +
           `┃ 𖹭 ${B('Action')} : ${NB('Please enter name')}\n` +
           `┃ 𖹭 ${B('Usage')} : ${NB('.' + command)} <${NB(type)}>\n` +
           `┣━━━━━━━━━━━━━━━━━━━━━━┫\n` +
           `┃ 🎀 ${B('Awaiting your command')}...\n` +
           `╰━━━〔 ${B('LUXE EDITION')} 〕━━━╯\n\n${randomFooter()}`;
}

async function safeReaction(conn, from, mek, emoji) {
    try {
        await conn.sendMessage(from, { react: { text: emoji, key: mek.key } });
    } catch {}
}

// 🛡️ PROVEN SEQUENTIAL ENGINE: Tries providers one by one until success
async function getWorkingUrls(url, type = 'mp3') {
    const providers = [
        async () => {
            const res = await axios.get(`https://jawad-tech.vercel.app/download/ytdl?url=${encodeURIComponent(url)}`, AXIOS_OPTS);
            const link = type === 'mp3' ? res.data?.result?.mp3 : res.data?.result?.mp4;
            if (res.data?.status && link) return link;
            throw new Error('Jawad failed');
        },
        async () => {
            const res = await axios.get(`https://eliteprotech-apis.zone.id/ytdown?url=${encodeURIComponent(url)}&format=${type === 'mp3' ? 'mp3' : 'mp4'}`, AXIOS_OPTS);
            const link = res.data?.downloadURL;
            if (res.data?.success && link) return link;
            throw new Error('ElitePro failed');
        },
        async () => {
            const res = await axios.get(`https://api.siputzx.my.id/api/d/yt${type === 'mp3' ? 'mp3' : 'mp4'}?url=${encodeURIComponent(url)}`, AXIOS_OPTS);
            const link = res.data?.data?.dl;
            if (res.data?.status && link) return link;
            throw new Error('Siputzx failed');
        },
        async () => {
            const res = await axios.get(`https://adeel-xtech-api.vercel.app/download/yt${type === 'mp3' ? 'mp3' : 'mp4'}?url=${encodeURIComponent(url)}`, AXIOS_OPTS);
            const link = res.data?.result?.download_url;
            if (res.data?.status && link) return link;
            throw new Error('Adeel failed');
        }
    ];

    for (const provider of providers) {
        try {
            const link = await provider();
            if (link) return link;
        } catch (e) {}
    }
    throw new Error('All download providers are currently busy.');
}

async function ytSearchQuery(query) {
    const isUrl = query.includes('youtube.com') || query.includes('youtu.be');
    if (isUrl) {
        try {
            const oembed = await axios.get('https://www.youtube.com/oembed', { params: { url: query, format: 'json' }, timeout: 5000 });
            return { url: query, title: oembed.data.title || 'YouTube Media', author: oembed.data.author_name || 'Unknown', thumb: oembed.data.thumbnail_url || '' };
        } catch {
            return { url: query, title: 'YouTube Media', author: 'Unknown', thumb: '' };
        }
    }
    const search = await yts(query);
    if (!search.videos?.length) throw new Error('No results found.');
    const v = search.videos[0];
    return { url: v.url, title: v.title, duration: v.timestamp, author: v.author?.name, thumb: v.thumbnail };
}

// 1. .play / .song
cmd({ pattern: 'ytmp3', alias: ['song', 'play'], desc: 'Download YouTube as MP3', category: 'download', react: '🎵' },
async (conn, mek, m, { reply, args, from }) => {
    const query = args.join(' ').trim();
    if (!query) return reply(usageBox('play', 'name'));
    
    try {
        await safeReaction(conn, from, mek, '🔍');
        const video = await ytSearchQuery(query);
        
        await safeReaction(conn, from, mek, '⏳');
        await conn.sendMessage(from, {
            image: { url: video.thumb || 'https://i.postimg.cc/y6GV9P3H/file-000000004c307206bc366893b817568c-(1).png' },
            caption: dlBox('YOUTUBE MP3', [
                `🎵 ${video.title?.slice(0, 50)}`,
                `👤 ${video.author}`,
                ...(video.duration ? [`⏱️ ${video.duration}`] : []),
                `⏳ Downloading...`
            ], '🎵')
        }, { quoted: fakevCard }).catch(() => {});

        const downloadUrl = await getWorkingUrls(video.url, 'mp3');
        
        try {
            await conn.sendMessage(from, {
                audio: { url: downloadUrl },
                mimetype: 'audio/mpeg',
                fileName: `${video.title?.slice(0,30)}.mp3`,
                ptt: false
            }, { quoted: mek });
        } catch (e) {
            const res = await axios.get(downloadUrl, { responseType: 'arraybuffer', timeout: 45000 });
            await conn.sendMessage(from, {
                audio: Buffer.from(res.data),
                mimetype: 'audio/mpeg',
                fileName: `${video.title?.slice(0,30)}.mp3`,
                ptt: false
            }, { quoted: mek });
        }

        await safeReaction(conn, from, mek, '✅');
    } catch (e) {
        await safeReaction(conn, from, mek, '❌');
        reply(`❌ *Download failed!*\n\n*Error:* ${e.message}`);
    }
});

// 2. .video / .ytmp4
cmd({ pattern: 'ytmp4', alias: ['video', 'yta', 'ytv'], desc: 'Download YouTube as MP4', category: 'download', react: '🎬' },
async (conn, mek, m, { reply, args, from }) => {
    const query = args.join(' ').trim();
    if (!query) return reply(usageBox('video', 'name'));
    
    try {
        await safeReaction(conn, from, mek, '🔍');
        const video = await ytSearchQuery(query);
        
        await safeReaction(conn, from, mek, '⏳');
        await conn.sendMessage(from, {
            image: { url: video.thumb || 'https://i.postimg.cc/y6GV9P3H/file-000000004c307206bc366893b817568c-(1).png' },
            caption: dlBox('YOUTUBE MP4', [
                `🎬 ${video.title?.slice(0, 50)}`,
                `👤 ${video.author}`,
                ...(video.duration ? [`⏱️ ${video.duration}`] : []),
                `⏳ Downloading...`
            ], '🎬')
        }, { quoted: fakevCard }).catch(() => {});

        const downloadUrl = await getWorkingUrls(video.url, 'mp4');

        try {
            await conn.sendMessage(from, {
                video: { url: downloadUrl },
                mimetype: 'video/mp4',
                caption: dlBox('DONE', [`🎬 ${video.title?.slice(0,50)}`], '✅')
            }, { quoted: mek });
        } catch (e) {
            const res = await axios.get(downloadUrl, { responseType: 'arraybuffer', timeout: 60000 });
            await conn.sendMessage(from, {
                video: Buffer.from(res.data),
                mimetype: 'video/mp4',
                caption: dlBox('DONE', [`🎬 ${video.title?.slice(0,50)}`], '✅')
            }, { quoted: mek });
        }

        await safeReaction(conn, from, mek, '✅');
    } catch (e) {
        await safeReaction(conn, from, mek, '❌');
        reply(`❌ *Download failed!*\n\n*Error:* ${e.message}`);
    }
});

// 3. Pinterest Search (.pins / .pinterest)
function normalizePinResults(payload) {
    if (!payload) return [];
    const container = payload.result || payload.data || payload.pins || payload;
    const arr = Array.isArray(container) ? container : (container.data || container.result || []);
    if (!Array.isArray(arr)) return [];
    return arr.map(item => {
        if (typeof item === 'string') return { url: item, isVideo: false };
        const url = item.url || item.image || item.image_url || item.thumbnail || item.video || item.link;
        const isVideo = !!item.video || item.type === 'video' || /\.mp4($|\?)/i.test(url || '');
        return url ? { url, isVideo } : null;
    }).filter(Boolean);
}

async function searchPinterest(query) {
    try {
        const res = await axios.get(`https://api.siputzx.my.id/api/s/pinterest?query=${encodeURIComponent(query)}`, AXIOS_OPTS);
        const results = normalizePinResults(res.data);
        if (results.length) return results;
    } catch (e) {}
    try {
        const res = await axios.get(`https://okatsu-rolezapiiz.vercel.app/search/pinterest?query=${encodeURIComponent(query)}`, AXIOS_OPTS);
        const results = normalizePinResults(res.data);
        if (results.length) return results;
    } catch (e) {}
    throw new Error('No Pinterest results found');
}

cmd({ pattern: 'pinsearch', alias: ['pins', 'pinterestsearch', 'pinterest'], desc: 'Search Pinterest for images/videos by keyword', category: 'download', react: '🔍' },
async (conn, mek, m, { reply, args, from }) => {
    const query = args.join(' ').trim();
    if (!query) return reply(usageBox('pins', 'keyword'));
    
    try {
        await safeReaction(conn, from, mek, '⏳');
        const results = await searchPinterest(query);
        if (!results.length) throw new Error('No results found');

        const picks = results.slice(0, 5);
        for (let i = 0; i < picks.length; i++) {
            const item = picks[i];
            const caption = i === 0
                ? dlBox('PINTEREST', [`🔎 ${query}`, `📸 ${picks.length} pins`], '📌')
                : undefined;
            try {
                if (item.isVideo) {
                    await conn.sendMessage(from, { video: { url: item.url }, mimetype: 'video/mp4', caption }, { quoted: mek });
                } else {
                    await conn.sendMessage(from, { image: { url: item.url }, caption }, { quoted: mek });
                }
            } catch (e) {}
        }
        await safeReaction(conn, from, mek, '✅');
    } catch (e) {
        await safeReaction(conn, from, mek, '❌');
        reply(`❌ *Pinterest search failed!*\n\n*Error:* ${e.message}`);
    }
});
