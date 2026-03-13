const mongoose = require('mongoose');

const reportSchema = new mongoose.Schema({
    phoneNumber: String,
    category: String,
    subCategory: String,
    timestamp: { type: Date, default: Date.now },
    status: { type: String, default: 'Pending' }
});

module.exports = mongoose.model('Report', reportSchema);