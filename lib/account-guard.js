// Shared authorization helpers for settings scoped to one paired bot account.
//
// `isMe` means the sender is the actual number paired to the current socket.
// `isOwner` means the configured global owner or explicitly trusted sudo user.
// A setting guard must accept either, but must never trust a group admin alone
// for a bot-account setting. Every denied attempt is reported clearly; no
// settings command is silently ignored.

function isAccountOwner({ isOwner = false, isMe = false } = {}) {
    return Boolean(isOwner || isMe);
}

function shouldSilentDeny({ isPairedElsewhere = false } = {}) {
    return Boolean(isPairedElsewhere);
}

function accountSettingGuard({ isOwner, isMe, isPairedElsewhere, reply, message } = {}) {
    if (isAccountOwner({ isOwner, isMe })) return true;
    if (typeof reply === 'function') {
        reply(message || '❌ Owner only — you cannot change another user\'s settings.');
    }
    return false;
}

module.exports = { isAccountOwner, shouldSilentDeny, accountSettingGuard };
