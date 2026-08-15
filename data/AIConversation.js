// Persistent, bounded context for AI auto-replies. This stores only the
// recent conversational turns needed for continuity; it is not a full chat log.
const jsondb = require('../lib/mongo');

const AIConversation = jsondb.model('AIConversation');

async function loadConversation(conversationKey) {
    try {
        const doc = await AIConversation.findOne({ conversationKey });
        return doc ? doc.toObject() : null;
    } catch (error) {
        console.error('AI conversation load error:', error.message);
        return null;
    }
}

async function saveConversation(conversationKey, data) {
    try {
        await AIConversation.findOneAndUpdate(
            { conversationKey },
            { conversationKey, ...data },
            { upsert: true, new: true }
        );
        return true;
    } catch (error) {
        console.error('AI conversation save error:', error.message);
        return false;
    }
}

module.exports = { loadConversation, saveConversation };
