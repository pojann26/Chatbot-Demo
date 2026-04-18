const Session = require('../models/Session');
const { sessionTimeoutMs } = require('../config');

// FIX: In-memory lock untuk mencegah race condition
// Ketika 2 pesan dari user yang sama datang bersamaan, yang kedua akan di-skip
const processingLocks = new Set();

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

async function setSession(phoneNumber, state, categoryKey = null, extra = {}) {
    await Session.findOneAndUpdate(
        { phoneNumber },
        { state, categoryKey, extra, updatedAt: new Date() },
        { upsert: true, new: true }
    );
}

async function clearSession(phoneNumber) {
    await Session.deleteOne({ phoneNumber });
}

// FIX: Lock functions — dipakai di handler.js untuk serialisasi pesan per user
function acquireLock(phoneNumber) {
    if (processingLocks.has(phoneNumber)) return false;
    processingLocks.add(phoneNumber);
    return true;
}

function releaseLock(phoneNumber) {
    processingLocks.delete(phoneNumber);
}

module.exports = { getSession, setSession, clearSession, acquireLock, releaseLock };