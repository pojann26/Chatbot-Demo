const { v4: uuidv4 } = require('uuid');
const { menus, keywords, triggers, adminNumber, emergencyKeywords, isOperationalHour } = require('../config');
const { getSession, setSession, clearSession } = require('../services/session');
const { saveToSheets, updateSheetStatus } = require('../services/sheets');
const { isRateLimited } = require('../utils/rateLimiter');
const Report = require('../models/Report');

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// --- PESAN KONSTAN ---
const MSG_WELCOME_OPERATIONAL =
    'Halo Sobat! 👋\n\n' +
    'Selamat datang di *SobatCare* 🤝\n' +
    '_"Tempat Kamu Didengar, Dibantu, dan Diperjuangkan."_\n\n' +
    'Aku SobatKM, siap bantu kamu hari ini 🤝\n\n' +
    'Ada yang bisa aku bantu?\n' +
    'Silakan ketik *"Halo SobatCare"* untuk mulai ya 😊';

const MSG_WELCOME_OFFLINE =
    'Halo Sobat! 👋\n\n' +
    'Aku *SobatCare* 🤝\n\n' +
    'Saat ini kami sedang di luar jam layanan\n' +
    '*(07.00–22.00 WIB)* ⏰\n\n' +
    'Tapi tenang, pesanmu tetap kami terima ya 💙\n\n' +
    'Silahkan ketik *"halo admin"*, nanti akan kami respon secepatnya saat online 😊';

const MSG_MAIN_MENU =
    'Sobat lagi butuh bantuan apa nih? 😊\n\n' +
    'Ketik angka ya 👇\n\n' +
    '1️⃣ Kesejahteraan Mahasiswa 🫰\n' +
    '2️⃣ Akademik & Prestasi 🏆\n' +
    '3️⃣ Aspirasi & Pengaduan 🗣️\n' +
    '4️⃣ Sobat Curhat 🫂\n' +
    '5️⃣ Hubungi Mimin SobatKM! 📩';

const MSG_CURHAT_OPENING =
    'Hai SobatKM 👋\n\n' +
    'Pasti hari kamu lelah banget yah?\n' +
    'Pasti tugasnya numpuk banget yah?\n' +
    'Udah burnout?\n\n' +
    'Sobat bisa cerita apa aja di sini 💙\n' +
    'Tenang, aku pastikan aman & rahasia yah sobat! 🤝';

const MSG_CURHAT_REPLY =
    'Semangat yah, kamu pasti kuat dan bisa jalanin semuanya 💪\n' +
    'Jangan lupa buat istirahat, sayangin dirimu yah.. 🥺\n\n' +
    'Mau aku hubungin dengan Admin SobatCare?\n\n' +
    '1️⃣ Iya mau dong!\n' +
    '2️⃣ Ngga dulu deh, aku cuma mau release emosi aja.';

const MSG_INPUT_MASALAH =
    'Baik Sobat, aku bantu ya 🤝\n\n' +
    'Silakan tuliskan pesanmu secara lengkap yah 😊';

const MSG_SUDAH_TERBANTU =
    'Apakah masalah Sobat sudah terbantu? 😊\n\n' +
    '1️⃣ Sudah\n' +
    '2️⃣ Belum';

const MSG_CLOSING =
    'Terima kasih sudah menggunakan *SobatCare* sebagai sahabat mu yah! 🤗\n\n' +
    'See you Sobat! 🤝👋';

const MSG_ESCALATE =
    'Tenang Sobat, aku hubungkan ke Admin SobatKM ya! 🤝\n\n' +
    'Admin akan segera menghubungi kamu 💙';

// --- HELPER ---
function isEmergencyMessage(text) {
    return emergencyKeywords.some(keyword => text.includes(keyword));
}

function buildAdminNotif(type, data) {
    const emergencyTag = data.isEmergency ? '🚨 *DARURAT*' : '📋 *REGULER*';
    if (type === 'laporan') {
        return (
            `${emergencyTag} — *LAPORAN MASUK* 🚨\n\n` +
            `🔖 *ID:* ${data.reportId}\n` +
            `📂 *Kategori:* ${data.category}\n` +
            `🔍 *Sub:* ${data.subCategory}\n` +
            `📝 *Pesan:* ${data.keterangan}\n\n` +
            `_Cek database untuk detail pelapor._`
        );
    }
    if (type === 'curhat') {
        return (
            `💬 *SOBAT CURHAT — Minta Dihubungi* 🫂\n\n` +
            `🔖 *ID:* ${data.reportId}\n` +
            `📝 *Cerita:* ${data.keterangan}\n\n` +
            `_Segera hubungi sobat ini ya!_`
        );
    }
    if (type === 'mimin') {
        return (
            `📩 *HUBUNGI MIMIN*\n\n` +
            `🔖 *ID:* ${data.reportId}\n` +
            `📝 *Pesan:* ${data.keterangan}\n\n` +
            `_Segera hubungi sobat ini ya!_`
        );
    }
    if (type === 'belum') {
        return (
            `⚠️ *MASALAH BELUM TERSELESAIKAN*\n\n` +
            `🔖 *ID:* ${data.reportId}\n` +
            `📂 *Kategori:* ${data.category}\n` +
            `_Sobat membutuhkan bantuan lanjutan!_`
        );
    }
}

// --- HANDLER UTAMA ---
async function handleMessage(sock, from, text) {
    const normalizedText = text.toLowerCase().trim();
    const isTrigger = triggers.includes(normalizedText);
    const session = await getSession(from);
    const isInSession = session && session.state !== 'DONE';

    // Trigger — masuk ke state INPUT_IDENTITAS dulu
    if (isTrigger) {
        await sock.sendPresenceUpdate('composing', from);
        await delay(1000);
        if (!isOperationalHour()) {
            await sock.sendMessage(from, { text: MSG_WELCOME_OFFLINE });
            return;
        }
        await setSession(from, 'INPUT_IDENTITAS');
        await sock.sendMessage(from, {
            text:
                'Halo Sobat! 👋\n\n' +
                'Selamat datang di *SobatCare* 🤝\n' +
                '_"Tempat Kamu Didengar, Dibantu, dan Diperjuangkan."_\n\n' +
                'Sebelum mulai, boleh aku kenalan dulu? 😊\n\n' +
                'Silakan kirim data dirimu dengan format:\n' +
                '👉 *Nama Lengkap | NIM*\n\n' +
                'Contoh: _Budi Santoso | J0401231001_'
        });
        return;
    }

    // State INPUT_IDENTITAS — proses nama & NIM
    if (session && session.state === 'INPUT_IDENTITAS') {
        await sock.sendPresenceUpdate('composing', from);
        await delay(1000);

        // Cek format pemisah |
        if (!text.includes('|')) {
            await sock.sendMessage(from, {
                text:
                    '⚠️ Format belum sesuai nih Sobat 😊\n\n' +
                    'Coba kirim ulang dengan format:\n' +
                    '👉 *Nama Lengkap | NIM*\n\n' +
                    'Contoh: _Budi Santoso | J0409241025_'
            });
            return;
        }

        const [nama, nimRaw] = text.split('|').map(v => v.trim());
        const nim = nimRaw?.toUpperCase();

        // Cek nama tidak kosong
        if (!nama || nama.length < 2) {
            await sock.sendMessage(from, {
                text:
                    '⚠️ Nama tidak boleh kosong ya Sobat 😊\n\n' +
                    'Format: *Nama Lengkap | NIM*'
            });
            return;
        }

        // Validasi NIM IPB:
        // - Tepat 11 karakter
        // - Digit 1: huruf kode fakultas/sekolah (A-Z) atau X (inbound)
        // - Digit 2: angka (kode departemen / lokasi kampus)
        // - Digit 3: angka strata (4=Sarjana/Terapan, 5=Magister, 6=Doktor, 9=Profesi)
        // - Digit 4-5: angka kode prodi
        // - Digit 6-7: angka tahun masuk (00-99)
        // - Digit 8: periode masuk (1=Gasal, 2=Genap)
        // - Digit 9-11: nomor urut (001-999)
        const nimRegex = /^[A-Z]\d[4569]\d{2}\d{2}\d\d{3}$/;

        if (!nim || nim.length !== 11 || !nimRegex.test(nim)) {
            await sock.sendMessage(from, {
                text:
                    '⚠️ NIM yang kamu masukkan tidak sesuai format IPB nih Sobat 😊\n\n' +
                    'Contoh: _J0409241025_\n\n' +
                    'Coba kirim ulang dengan format:\n' +
                    '👉 *Nama Lengkap | NIM*'
            });
            return;
        }

        await setSession(from, 'MAIN_MENU', null, { nama, nim });
        await sock.sendMessage(from, {
            text:
                `Halo *${nama}* 👋\n\n` +
                'Data kamu sudah kami terima 🤝\n\n' +
                MSG_MAIN_MENU
        });
        return;
    }

    // Keyword biasa — hanya welcome, belum masuk sesi
    const isKeyword = keywords.includes(normalizedText);
    if (isKeyword && !isInSession) {
        await sock.sendPresenceUpdate('composing', from);
        await delay(1000);
        if (!isOperationalHour()) {
            await sock.sendMessage(from, { text: MSG_WELCOME_OFFLINE });
            return;
        }
        await sock.sendMessage(from, { text: MSG_WELCOME_OPERATIONAL });
        return;
    }

    // Bukan keyword/trigger dan tidak ada sesi aktif — abaikan
    if (!isInSession) return;

    console.log(`📩 [${new Date().toISOString()}] ${from} | "${normalizedText}" | State: ${session.state}`);

    await sock.sendPresenceUpdate('composing', from);
    await delay(1000);

    // A. MENU UTAMA
    if (session.state === 'MAIN_MENU') {
        const chosen = menus[normalizedText];
        if (!chosen) {
            await sock.sendMessage(from, { text: '⚠️ Ketik angka *1-5* saja ya Sobat, atau ketik *"Halo SobatCare"* untuk mulai ulang.' });
            return;
        }
        if (normalizedText === '4') {
            await setSession(from, 'CURHAT', null, { menuLabel: 'Sobat Curhat', nama: session.extra?.nama, nim: session.extra?.nim });
            await sock.sendMessage(from, { text: MSG_CURHAT_OPENING });
            return;
        }
        if (normalizedText === '5') {
            await setSession(from, 'HUBUNGI_ADMIN', null, { nama: session.extra?.nama, nim: session.extra?.nim });
            await sock.sendMessage(from, { text: MSG_INPUT_MASALAH });
            return;
        }
        await setSession(from, chosen.nextState, normalizedText, { nama: session.extra?.nama, nim: session.extra?.nim });
        await sock.sendMessage(from, { text: chosen.prompt });
        return;
    }

// B. SUB MENU
const subStates = ['SUB_KESEJAHTERAAN', 'SUB_AKADEMIK', 'SUB_ASPIRASI'];
if (subStates.includes(session.state)) {
    const categoryData = menus[session.categoryKey];
    const subItem = categoryData?.subMenu[normalizedText];

    if (!subItem) {
        const maxOption = Object.keys(categoryData.subMenu).length;
        await sock.sendMessage(from, { text: `⚠️ Ketik angka *1-${maxOption}* saja ya Sobat 😊` });
        return;
    }

    // Tipe INFO — langsung balas dengan info, lanjut ke feedback
    if (subItem.type === 'INFO' || subItem.type === 'MULTI_INFO') {
        await sock.sendMessage(from, { text: subItem.response });
        await delay(500);

        // Catat ke Sheets
        const reportId = `SC-${uuidv4().slice(0, 8).toUpperCase()}`;
        await saveToSheets({
            reportId,
            nama: session.extra?.nama || '-',
            nim: session.extra?.nim || '-',
            category: categoryData.label,
            subCategory: subItem.label,
            isEmergency: false,
            keterangan: 'Permintaan informasi',
            status: 'Info Diberikan'
        });

        await setSession(from, 'FEEDBACK', null, {
            reportId,
            nama: session.extra?.nama,
            nim: session.extra?.nim,
            category: categoryData.label,
            subCategory: subItem.label
        });
        await sock.sendMessage(from, { text: MSG_SUDAH_TERBANTU });
        return;
    }

        // Tipe INPUT — user perlu tulis masalahnya
        await setSession(from, 'INPUT_MASALAH', session.categoryKey, {
            menuLabel: categoryData.label,
            subLabel: subItem.label,
            isEmergency: subItem.isEmergency,
            nama: session.extra?.nama,
            nim: session.extra?.nim
        });
        await sock.sendMessage(from, { text: MSG_INPUT_MASALAH });
        return;
    }

    // C. INPUT MASALAH
    if (session.state === 'INPUT_MASALAH') {
        const { menuLabel, subLabel, isEmergency } = session.extra || {};
        const emergencyDetected = isEmergency || isEmergencyMessage(normalizedText);

        const limited = await isRateLimited(from.split('@')[0]);
        if (limited) {
            await sock.sendMessage(from, { text: '⚠️ Sobat baru saja mengirim laporan. Harap tunggu beberapa menit ya 😊' });
            await clearSession(from);
            return;
        }

        const reportId = `SC-${uuidv4().slice(0, 8).toUpperCase()}`;
        const reportData = {
            reportId,
            phoneNumber: from.split('@')[0],
            nama: session.extra?.nama || '-',
            nim: session.extra?.nim || '-',
            category: menuLabel,
            subCategory: subLabel,
            isEmergency: emergencyDetected,
            keterangan: text,
            status: 'Masuk'
        };

        try {
            await Report.create(reportData);
            await saveToSheets(reportData);
            await sock.sendMessage(adminNumber, { text: buildAdminNotif('laporan', reportData) });
            await setSession(from, 'FEEDBACK', null, {
                reportId,
                category: menuLabel,
                subCategory: subLabel,
                nama: session.extra?.nama || '-',
                nim: session.extra?.nim || '-'
            });

            const emergencyNote = emergencyDetected
                ? '\n\n🚨 *Ini terdeteksi sebagai laporan darurat.* Admin akan segera menghubungi kamu!'
                : '';

            await sock.sendMessage(from, {
                text: `🔖 *ID Laporan:* \`${reportId}\`${emergencyNote}\n\n` + MSG_SUDAH_TERBANTU
            });
        } catch (err) {
            console.error(`❌ Gagal simpan laporan:`, err);
            await sock.sendMessage(from, { text: '❌ Terjadi kesalahan. Silakan coba lagi ya Sobat 🙏' });
        }
        return;
    }

    // D. SOBAT CURHAT
    if (session.state === 'CURHAT') {
        if (session.extra?.cerita) {
            if (normalizedText === '1') {
                const reportId = `SC-${uuidv4().slice(0, 8).toUpperCase()}`;
                const reportData = {
                    reportId,
                    phoneNumber: from.split('@')[0],
                    category: 'Sobat Curhat',
                    subCategory: 'Minta Dihubungi Admin',
                    isEmergency: false,
                    keterangan: session.extra.cerita,
                    status: 'Masuk'
                };
                await Report.create(reportData);
                await saveToSheets(reportData);
                await sock.sendMessage(adminNumber, { text: buildAdminNotif('curhat', reportData) });
                await sock.sendMessage(from, { text: MSG_ESCALATE });
                await clearSession(from);
            } else if (normalizedText === '2') {
                await sock.sendMessage(from, {
                    text: 'Oke Sobat, semangat terus yah! 💙\nIngat, kamu tidak sendirian 🤝\n\nKetik *"Halo SobatCare"* kalau butuh bantuan lagi ya 😊'
                });
                await clearSession(from);
            } else {
                await sock.sendMessage(from, { text: '⚠️ Ketik *1* atau *2* ya Sobat 😊' });
            }
            return;
        }

        await setSession(from, 'CURHAT', null, { ...session.extra, cerita: text });
        await sock.sendMessage(from, { text: MSG_CURHAT_REPLY });
        return;
    }

    // E. HUBUNGI ADMIN
    if (session.state === 'HUBUNGI_ADMIN') {
        const reportId = `SC-${uuidv4().slice(0, 8).toUpperCase()}`;
        const reportData = {
            reportId,
            phoneNumber: from.split('@')[0],
            nama: session.extra?.nama || '-',
            nim: session.extra?.nim || '-',
            category: 'Hubungi Mimin',
            subCategory: 'Direct Contact',
            isEmergency: false,
            keterangan: text,
            status: 'Masuk'
        };

        try {
            await Report.create(reportData);
            await saveToSheets(reportData);
            await sock.sendMessage(adminNumber, { text: buildAdminNotif('mimin', reportData) });
            await sock.sendMessage(from, { text: MSG_ESCALATE });
            await clearSession(from);
        } catch (err) {
            console.error('❌ Gagal simpan hubungi mimin:', err);
            await sock.sendMessage(from, { text: '❌ Terjadi kesalahan. Silakan coba lagi ya Sobat 🙏' });
        }
        return;
    }

    // F. FEEDBACK
    if (session.state === 'FEEDBACK') {
        if (normalizedText === '1') {
            await sock.sendMessage(from, { text: MSG_CLOSING });
            if (session.extra?.reportId) {
                await updateSheetStatus(session.extra.reportId, 'Selesai');
            }
            await clearSession(from);
        } else if (normalizedText === '2') {
            if (session.extra?.reportId) {
                await sock.sendMessage(adminNumber, {
                    text: buildAdminNotif('belum', {
                        reportId: session.extra.reportId,
                        category: session.extra.category,
                        subCategory: session.extra.subCategory,
                        nama: session.extra?.nama || '-',
                        nim: session.extra?.nim || '-'
                    })
                });
                await updateSheetStatus(session.extra.reportId, 'Eskalasi');
            } else {
                // Sub-menu INFO yang belum terbantu — escalate ke admin
                await sock.sendMessage(adminNumber, {
                    text: `⚠️ *INFO BELUM MEMBANTU*\n\n📂 *Kategori:* ${session.extra?.category}\n🔍 *Sub:* ${session.extra?.subCategory}\n\n_Sobat butuh bantuan lebih lanjut!_`
                });
            }
            await sock.sendMessage(from, { text: MSG_ESCALATE });
            await clearSession(from);
        } else {
            await sock.sendMessage(from, { text: '⚠️ Ketik *1* (Sudah) atau *2* (Belum) ya Sobat 😊' });
        }
        return;
    }
}

module.exports = { handleMessage };