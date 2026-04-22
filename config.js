require('dotenv').config();

const OPERATIONAL_START = 7;
const OPERATIONAL_END = 22;

function isOperationalHour() {
    const now = new Date();
    const jakartaHour = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Jakarta' })).getHours();
    return jakartaHour >= OPERATIONAL_START && jakartaHour < OPERATIONAL_END;
}

module.exports = {
    mongoURI: process.env.MONGO_URI,
    spreadsheetId: process.env.SPREADSHEET_ID,
    adminNumber: process.env.ADMIN_NUMBER,
    sessionTimeoutMs: (parseInt(process.env.SESSION_TIMEOUT_MINUTES) || 30) * 60 * 1000,
    rateLimitMs: (parseInt(process.env.RATE_LIMIT_MINUTES) || 10) * 60 * 1000,
    isOperationalHour,

    triggers: ['halo sobatcare', 'halo sobat care'],

    keywords: [
        'halo', 'hi', 'hey', 'p', 'permisi', 'pagi', 'siang', 'sore', 'malam',
        'assalamualaikum', 'menu', 'halo sobatcare', 'halo sobat care'
    ],

    emergencyKeywords: [
        'kekerasan', 'pelecehan', 'pelecehan seksual', 'kekerasan seksual',
        'asusila', 'hilang', 'darurat', 'bahaya', 'tolong', 'minta tolong',
        'gangguan binatang', 'kehilangan'
    ],

    menus: {
        '1': {
            label: 'Kesejahteraan Mahasiswa 🫰',
            nextState: 'SUB_KESEJAHTERAAN',
            prompt:
                'Silahkan ketik angka sesuai kebutuhan mu yah sobat! 🤗\n\n' +
                '1. Bantuan Darurat (Kesehatan, Financial)\n' +
                '2. Informasi UKT dan Beasiswa\n' +
                '3. Layanan Keselamatan, Keamanan & Kesejahteraan Kampus\n' +
                '4. Layanan Edukasi Mahasiswa',
            subMenu: {
                '1': {
                    label: 'Bantuan Darurat',
                    isEmergency: true,
                    type: 'MULTI_INFO',
                    response:
                        '🚨 *Bantuan Darurat* 🚨\n\n' +
                        '🏥 *Masalah Kesehatan?*\n' +
                        'Hubungi Poli Klinik IPB:\n' +
                        '👉 https://wa.me/6287775692881\n\n' +
                        '💰 *Masalah Financial / Sangat Darurat?*\n' +
                        'Hubungi Admin SobatCare langsung:\n' +
                        '👉 https://wa.me/6285610435042\n\n' +
                        'Semoga segera teratasi ya Sobat! 💙'
                },
                '2': {
                    label: 'Informasi UKT dan Beasiswa',
                    isEmergency: false,
                    type: 'INFO',
                    response:
                        '📋 *Informasi UKT & Beasiswa* 📋\n\n' +
                        '🎓 *Portal Peduli UKT IPB:*\n' +
                        '👉 https://ipb.link/peduli-ukt-smstr-ganjil-26-27\n\n' +
                        '🏆 *Beasiswa IPB:*\n' +
                        '👉 https://www.instagram.com/beasiswaipb\n\n' +
                        '💙 *SayangKM IPB:*\n' +
                        '👉 https://www.instagram.com/sayangkmipb\n\n' +
                        'Semoga bermanfaat ya Sobat! 😊'
                },
                '3': {
                    label: 'Layanan Keselamatan & Keamanan Kampus',
                    isEmergency: false,
                    type: 'INFO',
                    response:
                        '🔐 *Layanan Keselamatan & Keamanan Kampus* 🔐\n\n' +
                        'Hubungi Unit Keamanan Kampus:\n' +
                        '👮 *Pak Rudi*\n' +
                        '👉 https://wa.me/6285715060184\n\n' +
                        'Tetap aman ya Sobat! 💙'
                },
                '4': {
                    label: 'Layanan Edukasi Mahasiswa',
                    isEmergency: false,
                    type: 'INFO',
                    response:
                        '📚 *Layanan Edukasi Mahasiswa* 📚\n\n' +
                        'Yuk cek info edukasi lengkapnya di sini ya Sobat! 😊\n\n' +
                        '💙 *SayangKM IPB:*\n' +
                        '👉 https://www.instagram.com/sayangkmipb\n\n' +
                        '🏆 *Beasiswa IPB:*\n' +
                        '👉 https://www.instagram.com/beasiswaipb'
                }
            }
        },
        '2': {
            label: 'Akademik & Prestasi 🏆',
            nextState: 'SUB_AKADEMIK',
            prompt:
                'Silahkan ketik angka sesuai kebutuhan mu yah sobat! 🤗\n\n' +
                '1. Informasi Akademik, Lomba, dan PKM\n' +
                '2. Informasi Beasiswa Internasional\n' +
                '3. Layanan Edukasi Prestasi',
            subMenu: {
                '1': {
                    label: 'Informasi Akademik, Lomba & PKM',
                    isEmergency: false,
                    type: 'INFO',
                    response:
                        '🎓 *Informasi Akademik, Lomba & PKM* 🎓\n\n' +
                        'Cek info terbaru seputar akademik, lomba, dan PKM di sini ya Sobat! 🏅\n\n' +
                        '🌟 *IPB Prestasi:*\n' +
                        '👉 https://www.instagram.com/ipbprestasi\n\n' +
                        '📚 *BEM KM IPB Edu:*\n' +
                        '👉 https://www.instagram.com/bemkmipb_edu'
                },
                '2': {
                    label: 'Informasi Beasiswa Internasional',
                    isEmergency: false,
                    type: 'INFO',
                    response:
                        '🌍 *Informasi Beasiswa Internasional* 🌍\n\n' +
                        'Cek info beasiswa internasional terbaru di sini ya Sobat! 🎓\n\n' +
                        '🌐 *IED IPB:*\n' +
                        '👉 https://www.instagram.com/ied_ipb\n\n' +
                        '📚 *BEM KM IPB Edu:*\n' +
                        '👉 https://www.instagram.com/bemkmipb_edu'
                },
                '3': {
                    label: 'Layanan Edukasi Prestasi',
                    isEmergency: false,
                    type: 'INFO',
                    response:
                        '🏅 *Layanan Edukasi Prestasi* 🏅\n\n' +
                        'Yuk tingkatkan prestasimu bersama kami! 💪\n\n' +
                        '🌟 *IPB Prestasi:*\n' +
                        '👉 https://www.instagram.com/ipbprestasi'
                }
            }
        },
        '3': {
            label: 'Aspirasi & Pengaduan 🗣️',
            nextState: 'SUB_ASPIRASI',
            prompt:
                'Silahkan ketik angka sesuai kebutuhan mu yah sobat! 🤗\n\n' +
                '1. Kekerasan Seksual dan Pelecehan Seksual\n' +
                '2. Tindakan Asusila\n' +
                '3. Kehilangan dan Gangguan Binatang\n' +
                '4. Kritik & Saran BEM KM\n' +
                '5. Fasilitas dan Sarana Prasarana Kampus',
            subMenu: {
                '1': { label: 'Kekerasan & Pelecehan Seksual', isEmergency: true, type: 'INPUT' },
                '2': { label: 'Tindakan Asusila', isEmergency: true, type: 'INPUT' },
                '3': { label: 'Kehilangan dan Gangguan Binatang', isEmergency: true, type: 'INPUT' },
                '4': { label: 'Kritik & Saran BEM KM', isEmergency: false, type: 'INPUT' },
                '5': { label: 'Fasilitas & Sarana Prasarana', isEmergency: false, type: 'INPUT' }
            }
        },
        '4': {
            label: 'Sobat Curhat 🫂',
            nextState: 'CURHAT',
            prompt: null
        },
        '5': {
            label: 'Hubungi Mimin SobatKM! 📩',
            nextState: 'HUBUNGI_ADMIN',
            prompt: null
        }
    }
};