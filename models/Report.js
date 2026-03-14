const mongoose = require('mongoose');

const reportSchema = new mongoose.Schema({
    reportId: { type: String, required: true, unique: true },
    phoneNumber: { type: String, required: true },
    category: { type: String, required: true },
    subCategory: { type: String, required: true },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Report', reportSchema);