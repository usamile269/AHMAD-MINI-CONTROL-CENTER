'use strict';

const axios = require('axios');

const REQUEST_TIMEOUT_MS = Math.max(4000, Number(process.env.STALK_API_TIMEOUT_MS) || 10000);
const HEADERS = {
    'User-Agent': 'MINI-FINAL/1.0 (public profile lookup)',
    Accept: 'application/json, text/plain, */*'
};

function cleanUsername(value) {
    const username = String(value || '')
        .trim()
        .replace(/^@+/, '')
        .split(/\s+/)[0];

    if (!username || !/^[a-zA-Z0-9._-]{1,80}$/.test(username)) {
        throw new Error('Invalid profile username');
    }
    return username;
}

async function getJson(url, params) {
    const response = await axios.get(url, {
        params,
        timeout: REQUEST_TIMEOUT_MS,
        headers: HEADERS,
        validateStatus: (status) => status >= 200 && status < 500
    });

    if (response.status >= 400) {
        throw new Error(`HTTP ${response.status}`);
    }

    const body = response.data;
    if (!body || typeof body !== 'object') {
        throw new Error('Invalid JSON response');
    }
    return body;
}

async function tryEndpoints(endpoints, normalize, label) {
    let lastError;
    for (const endpoint of endpoints) {
        try {
            const body = await getJson(endpoint.url, endpoint.params);
            const normalized = normalize(body);
            if (normalized) return normalized;
            throw new Error('Profile data not present');
        } catch (error) {
            lastError = error;
            console.warn(`[STALKER] ${label} endpoint failed: ${endpoint.url} — ${error.message}`);
        }
    }
    throw new Error(`${label} profile lookup failed: ${lastError?.message || 'all public endpoints failed'}`);
}

function firstDefined(...values) {
    return values.find((value) => value !== undefined && value !== null && value !== '');
}

function asNumber(value) {
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (typeof value === 'string' && value.trim()) {
        const parsed = Number(value.replace(/,/g, '').trim());
        if (Number.isFinite(parsed)) return parsed;
    }
    return 0;
}

function asText(value, fallback = '') {
    if (value === undefined || value === null) return fallback;
    return String(value);
}

function unwrapTikTok(body) {
    const root = body?.data || body?.result || body;
    return {
        user: root?.user || root?.userInfo?.user || root?.user_info || root,
        stats: root?.stats || root?.userInfo?.stats || root?.user_info?.stats || {}
    };
}

function normalizeTikTok(body) {
    const { user, stats } = unwrapTikTok(body);
    const uniqueId = firstDefined(user?.unique_id, user?.uniqueId, user?.username, user?.userName);
    const nickname = firstDefined(user?.nickname, user?.nickName, user?.display_name, user?.name);
    const followerCount = firstDefined(stats?.followerCount, stats?.follower_count, user?.followerCount, user?.followers);
    const followingCount = firstDefined(stats?.followingCount, stats?.following_count, user?.followingCount, user?.following);
    const heartCount = firstDefined(stats?.heartCount, stats?.heart_count, user?.heartCount, user?.likes, user?.heart);
    const videoCount = firstDefined(stats?.videoCount, stats?.video_count, user?.videoCount, user?.videos, user?.video_count);
    const signature = firstDefined(user?.signature, user?.bio, user?.desc, user?.description);
    const avatarLarger = firstDefined(
        user?.avatarLarger,
        user?.avatar_larger,
        user?.avatar,
        user?.avatar_thumb,
        user?.avatarMedium,
        user?.avatar_medium
    );

    if (!uniqueId && !nickname) return null;
    return {
        uniqueId: asText(uniqueId),
        nickname: asText(nickname, asText(uniqueId)),
        followerCount: asNumber(followerCount),
        followingCount: asNumber(followingCount),
        heartCount: asNumber(heartCount),
        videoCount: asNumber(videoCount),
        signature: asText(signature, 'No public bio'),
        verified: Boolean(firstDefined(user?.verified, user?.is_verified, user?.verifiedAccount)),
        avatarLarger: asText(avatarLarger)
    };
}

function normalizeInstagram(body) {
    const root = body?.data || body?.result || body;
    const profile = root?.user || root?.profile || root?.account || root;
    const followers = firstDefined(
        profile?.followers,
        profile?.follower_count,
        profile?.followersCount,
        profile?.edge_followed_by?.count,
        profile?.stats?.followers
    );
    const following = firstDefined(
        profile?.following,
        profile?.following_count,
        profile?.followingCount,
        profile?.edge_follow?.count,
        profile?.stats?.following
    );
    const posts = firstDefined(
        profile?.posts,
        profile?.media_count,
        profile?.postsCount,
        profile?.edge_owner_to_timeline_media?.count,
        profile?.stats?.posts
    );
    const name = firstDefined(profile?.full_name, profile?.fullName, profile?.name, profile?.username, profile?.user_name);
    const avatar = firstDefined(profile?.profile_pic_url_hd, profile?.profile_pic_url, profile?.avatar, profile?.avatar_url, profile?.picture);
    const username = firstDefined(profile?.username, profile?.user_name, profile?.unique_id);

    if (!name && !username && followers === undefined && following === undefined && posts === undefined) return null;
    return {
        name: asText(name, asText(username)),
        followers: asNumber(followers),
        following: asNumber(following),
        posts: asNumber(posts),
        bio: asText(firstDefined(profile?.biography, profile?.bio, profile?.description), 'Profile info extracted from public web'),
        avatar: asText(avatar)
    };
}

async function tiktokStalk(value) {
    const username = cleanUsername(value);
    return tryEndpoints([
        { url: 'https://www.tikwm.com/api/user/info', params: { unique_id: username } },
        { url: 'https://api.tiklydown.eu.org/api/user', params: { username } }
    ], normalizeTikTok, 'TikTok');
}

async function instaStalk(value) {
    const username = cleanUsername(value);
    return tryEndpoints([
        { url: 'https://api.tiklydown.eu.org/api/instagram/user', params: { username } },
        { url: 'https://api.tiklydown.eu.org/api/instagram', params: { username } }
    ], normalizeInstagram, 'Instagram');
}

module.exports = { tiktokStalk, instaStalk };
