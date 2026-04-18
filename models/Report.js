const mongoose = require('mongoose');

const reportSchema = new mongoose.Schema({
    reportId:    { type: String, required: true, unique: true },
    phoneNumber: { type: String, required: true, index: true },  // FIX: index untuk rate limiter query
    nama:        { type: String, default: '-' },
    nim:         { type: String, default: '-' },
    category:    { type: String, required: true },
    subCategory: { type: String, required: true },
    isEmergency: { type: Boolean, default: false },
    keterangan:  { type: String, default: '-' },
    status:        { type: String, default: 'Masuk' },
    sheetRowNumber: { type: Number, default: null },  // FIX: simpan nomor baris Sheets untuk update langsung
    createdAt:     { type: Date, default: Date.now, index: true }
});

module.exports = mongoose.model('Report', reportSchema);