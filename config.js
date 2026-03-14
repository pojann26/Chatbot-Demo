require('dotenv').config();

module.exports = {
    mongoURI: process.env.MONGO_URI,
    spreadsheetId: process.env.SPREADSHEET_ID,
    adminNumber: process.env.ADMIN_NUMBER,
    sessionTimeoutMs: (parseInt(process.env.SESSION_TIMEOUT_MINUTES) || 30) * 60 * 1000,
    rateLimitMs: (parseInt(process.env.RATE_LIMIT_MINUTES) || 10) * 60 * 1000,

    categories: {
        '1': {
            label: 'Kesejahteraan Mahasiswa',
            nextState: 'SUB_KESEJAHTERAAN',
            prompt: 'Kategori Kesejahteraan:\n11. Pelecehan Seksual\n12. Kekerasan\n13. Masalah UKT\n\nKetik kode angkanya (11/12/13).',
            subMenu: {
                '11': 'Pelecehan Seksual',
                '12': 'Kekerasan',
                '13': 'Masalah UKT'
            }
        },
        '2': {
            label: 'Layanan Akademik',
            nextState: 'SUB_AKADEMIK',
            prompt: 'Kategori Akademik:\n21. Masalah KRS\n22. Info Beasiswa\n\nKetik kode angkanya (21/22).',
            subMenu: {
                '21': 'Masalah KRS',
                '22': 'Info Beasiswa'
            }
        }
    },

    keywords: ['menu', 'halo', 'p', 'permisi', 'pagi', 'siang', 'sore', 'malam', 'assalamualaikum', 'aduan', 'lapor', 'lapor telu']
};