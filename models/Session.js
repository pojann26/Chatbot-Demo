const mongoose = require('mongoose');

const sessionSchema = new mongoose.Schema({
    phoneNumber: { type: String, required: true, unique: true }, // unique otomatis buat index
    state:       { type: String, required: true },
    categoryKey: { type: String, default: null },
    extra:       { type: Object, default: {} },
    updatedAt:   { type: Date, default: Date.now }
});

// FIX: TTL index — MongoDB otomatis hapus session expired tanpa perlu cek manual
// Nilai expireAfterSeconds diset 0, artinya MongoDB hapus dokumen saat updatedAt + TTL tercapai
// TTL aktual dikontrol dari nilai field updatedAt + SESSION_TIMEOUT (30 menit = 1800 detik)
sessionSchema.index({ updatedAt: 1 }, { expireAfterSeconds: 1800 });

module.exports = mongoose.model('Session', sessionSchema);