const mongoose = require('mongoose');

const sessionSchema = new mongoose.Schema({
    phoneNumber: { type: String, required: true, unique: true },
    state: { type: String, required: true },
    categoryKey: { type: String, default: null },
    updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Session', sessionSchema);