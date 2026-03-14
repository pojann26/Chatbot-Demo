const Session = require('../models/Session');
const { sessionTimeoutMs } = require('../config');

async function getSession(phoneNumber) {
    const session = await Session.findOne({ phoneNumber });
    if (!session) return null;

    const isExpired = Date.now() - session.updatedAt.getTime() > sessionTimeoutMs;
    if (isExpired) {
        await Session.deleteOne({ phoneNumber });
        return null;
    }

    return session;
}

async function setSession(phoneNumber, state, categoryKey = null) {
    await Session.findOneAndUpdate(
        { phoneNumber },
        { state, categoryKey, updatedAt: new Date() },
        { upsert: true, new: true }
    );
}

async function clearSession(phoneNumber) {
    await Session.deleteOne({ phoneNumber });
}

module.exports = { getSession, setSession, clearSession };