// ============================================================================
// plugins/movie-drama.js — .movie / .drama info lookup
// ----------------------------------------------------------------------------
// 🔧 UPDATE (Bunty: "koi bhi name likhain drama a jay, movie bhi same") —
// both commands now try several providers/query variants in a fallback
// chain (same runFallbackChain() pattern used for downloaders/screenshot)
// instead of giving up after one exact-match lookup. Between Wikipedia +
// TVMaze + query variants, almost any real movie/drama name resolves to
// something now, instead of a quick "not found."
// ============================================================================

const { cmd } = require('../ahmad-core');
const axios = require('axios');
const { renderLuxe, renderError } = require('../lib/menu-styles');
const { runFallbackChain } = require('../lib/fallback-chain');

const stripHtml = (s) => String(s || '').replace(/<[^>]+>/g, '').trim();

async function wikiSummaryFor(query) {
    const search = await axios.get('https://en.wikipedia.org/w/api.php', {
        params: { action: 'query', list: 'search', srsearch: query, format: 'json', srlimit: 1 },
        timeout: 15000
    });
    const hit = search.data?.query?.search?.[0];
    if (!hit) throw new Error('no wiki match');
    const summary = await axios.get(
        `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(hit.title)}`,
        { timeout: 15000 }
    );
    const d = summary.data;
    if (!d?.extract) throw new Error('no summary');
    return {
        title: d.title,
        poster: d.thumbnail?.source || null,
        lines: [`Title: ${d.title}`, d.extract.slice(0, 500) + (d.extract.length > 500 ? '…' : '')]
    };
}

async function tvmazeSingleFor(query) {
    const { data } = await axios.get('https://api.tvmaze.com/singlesearch/shows', { params: { q: query }, timeout: 15000 });
    if (!data) throw new Error('no tvmaze match');
    const desc = stripHtml(data.summary);
    return {
        title: data.name,
        poster: data.image?.original || data.image?.medium || null,
        lines: [
            `Title: ${data.name}`,
            `Network: ${data.network?.name || data.webChannel?.name || 'Unknown'}`,
            `Status: ${data.status || 'Unknown'}`,
            `Premiered: ${data.premiered || 'Unknown'}`,
            `Rating: ${data.rating?.average ?? 'N/A'}`,
            '',
            (desc.slice(0, 400) + (desc.length > 400 ? '…' : '')) || 'No summary available.'
        ]
    };
}

async function tvmazeSearchFor(query) {
    const { data } = await axios.get('https://api.tvmaze.com/search/shows', { params: { q: query }, timeout: 15000 });
    const best = data?.[0]?.show;
    if (!best) throw new Error('no tvmaze results');
    const desc = stripHtml(best.summary);
    return {
        title: best.name,
        poster: best.image?.original || best.image?.medium || null,
        lines: [
            `Title: ${best.name}`,
            `Network: ${best.network?.name || best.webChannel?.name || 'Unknown'}`,
            `Status: ${best.status || 'Unknown'}`,
            `Premiered: ${best.premiered || 'Unknown'}`,
            `Rating: ${best.rating?.average ?? 'N/A'}`,
            '',
            (desc.slice(0, 400) + (desc.length > 400 ? '…' : '')) || 'No summary available.'
        ]
    };
}

async function sendResult(conn, mek, m, from, reply, result, cardTitle) {
    const card = renderLuxe(cardTitle, result.lines);
    if (result.poster) {
        await conn.sendMessage(from, { image: { url: result.poster }, caption: card }, { quoted: mek });
    } else {
        reply(card);
    }
    await conn.sendMessage(from, { react: { text: '✅', key: mek.key } });
}

cmd({
    pattern: "movie",
    desc: "Look up a movie — summary, poster (tries multiple sources)",
    category: "tools",
    use: ".movie Inception",
    filename: __filename
}, async (conn, mek, m, { from, q, reply }) => {
    if (!q) return reply(renderError('Usage: .movie <movie name>'));
    try {
        await conn.sendMessage(from, { react: { text: '🎬', key: mek.key } });
        const result = await runFallbackChain('MOVIE', [
            { name: 'Wiki (film)', run: () => wikiSummaryFor(`${q} film`) },
            { name: 'Wiki (movie)', run: () => wikiSummaryFor(`${q} movie`) },
            { name: 'Wiki (plain)', run: () => wikiSummaryFor(q) },
            { name: 'TVMaze (fallback)', run: () => tvmazeSingleFor(q) },
        ]);
        if (!result.ok) return reply(renderError(`Couldn't find anything for "${q}" — try a slightly different spelling.`));
        await sendResult(conn, mek, m, from, reply, result.value, 'Movie');
    } catch (e) {
        console.log('[MOVIE] error:', e.message);
        reply(renderError("Couldn't fetch that movie right now, try again shortly."));
    }
});

cmd({
    pattern: "drama",
    alias: ["series", "tvshow"],
    desc: "Look up a TV series/drama — summary, rating, poster (tries multiple sources)",
    category: "tools",
    use: ".drama Squid Game",
    filename: __filename
}, async (conn, mek, m, { from, q, reply }) => {
    if (!q) return reply(renderError('Usage: .drama <series/drama name>'));
    try {
        await conn.sendMessage(from, { react: { text: '🎬', key: mek.key } });
        const result = await runFallbackChain('DRAMA', [
            { name: 'TVMaze (single)', run: () => tvmazeSingleFor(q) },
            { name: 'TVMaze (search)', run: () => tvmazeSearchFor(q) },
            { name: 'Wiki (TV series)', run: () => wikiSummaryFor(`${q} TV series`) },
            { name: 'Wiki (plain)', run: () => wikiSummaryFor(q) },
        ]);
        if (!result.ok) return reply(renderError(`Couldn't find anything for "${q}" — try a slightly different spelling.`));
        await sendResult(conn, mek, m, from, reply, result.value, 'Drama');
    } catch (e) {
        console.log('[DRAMA] error:', e.message);
        reply(renderError("Couldn't fetch that drama/series right now, try again shortly."));
    }
});
