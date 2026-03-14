const Report = require('../models/Report');
const { rateLimitMs } = require('../config');

async function isRateLimited(phoneNumber) {
    const recent = await Report.findOne({
        phoneNumber,
        createdAt: { $gte: new Date(Date.now() - rateLimitMs) }
    });
    return !!recent;
}

module.exports = { isRateLimited };