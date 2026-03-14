const { v4: uuidv4 } = require('uuid');
const { categories, keywords, adminNumber } = require('../config');
const { getSession, setSession, clearSession } = require('../services/session');
const { saveToSheets } = require('../services/sheets');
const { isRateLimited } = require('../utils/rateLimiter');
const Report = require('../models/Report');

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const WELCOME_MESSAGE =
    "Selamat datang di *Layanan Aspirasi & Pengaduan BEM*! 👋\n\n" +
    "Halo, *TelUtizen*! Kami siap membantu menyampaikan aspirasi Anda.\n\n" +
    "Silakan pilih kategori laporan:\n\n" +
    "1️⃣ *Kesejahteraan Mahasiswa*\n" +
    "2️⃣ *Layanan Akademik*\n\n" +
    "Ketik angka *1* atau *2* untuk melanjutkan.";

async function handleMessage(sock, from, text) {
    const isKeyword = keywords.includes(text);
    const session = await getSession(from);
    const isInSession = session && session.state !== 'DONE';

    if (!isKeyword && !isInSession) return;

    console.log(`📩 [${new Date().toISOString()}] Pesan dari ${from}: "${text}" | State: ${session?.state ?? 'BARU'}`);

    await sock.sendPresenceUpdate('composing', from);
    await delay(1000);

    // A. Reset ke menu utama jika keyword
    if (isKeyword) {
        await setSession(from, 'MAIN_MENU');
        await sock.sendMessage(from, { text: WELCOME_MESSAGE });
        return;
    }

    // B. Menu utama
    if (session.state === 'MAIN_MENU') {
        const chosen = categories[text];
        if (!chosen) {
            await sock.sendMessage(from, { text: '⚠️ Pilih *1* atau *2* saja, atau ketik *menu* untuk mulai ulang.' });
            return;
        }
        await setSession(from, chosen.nextState, text);
        await sock.sendMessage(from, { text: chosen.prompt });
        return;
    }

    // C. Sub-menu & simpan laporan
    if (session.state === 'SUB_KESEJAHTERAAN' || session.state === 'SUB_AKADEMIK') {
        const categoryData = categories[session.categoryKey];
        const subLabel = categoryData?.subMenu[text];

        if (!subLabel) {
            await sock.sendMessage(from, { text: '⚠️ Kode tidak valid. Ketik *menu* untuk mulai ulang.' });
            return;
        }

        const limited = await isRateLimited(from.split('@')[0]);
        if (limited) {
            await sock.sendMessage(from, { text: '⚠️ Anda baru saja mengirim laporan. Harap tunggu beberapa menit sebelum membuat laporan baru.' });
            await clearSession(from);
            return;
        }

        const reportId = `BEM-${uuidv4().slice(0, 8).toUpperCase()}`;
        const reportData = {
            reportId,
            phoneNumber: from.split('@')[0],
            category: categoryData.label,
            subCategory: subLabel
        };

        try {
            await Report.create(reportData);
            await saveToSheets(reportData);

            await sock.sendMessage(from, {
                text: `✅ Laporan *${subLabel}* berhasil dicatat.\n\n` +
                      `🔖 *ID Laporan Anda:* \`${reportId}\`\n\n` +
                      `Simpan ID ini untuk memantau tindak lanjut. Admin BEM akan segera menghubungi.\n\nTerima kasih, *TelUtizen*!`
            });

            await sock.sendMessage(adminNumber, {
                text: `🚨 *LAPORAN MASUK BARU* 🚨\n\n` +
                      `🔖 *ID Laporan:* ${reportId}\n` +
                      `📂 *Kategori:* ${reportData.category}\n` +
                      `🔍 *Sub-Kategori:* ${reportData.subCategory}\n\n` +
                      `_Cek database untuk detail pelapor._`
            });

            await clearSession(from);
        } catch (err) {
            console.error(`❌ [${reportId}] Gagal menyimpan laporan:`, err);
            await sock.sendMessage(from, { text: '❌ Terjadi kesalahan saat menyimpan laporan. Silakan coba lagi.' });
        }
    }
}

module.exports = { handleMessage };