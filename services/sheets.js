const { GoogleSpreadsheet } = require('google-spreadsheet');
const { JWT } = require('google-auth-library');
const { spreadsheetId } = require('../config');

function getAuth() {
    const creds = require('../google-key.json');
    return new JWT({
        email: creds.client_email,
        key: creds.private_key,
        scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });
}

// Cache koneksi doc agar tidak reconnect setiap request
let _doc = null;
async function getDoc() {
    if (!_doc) {
        _doc = new GoogleSpreadsheet(spreadsheetId, getAuth());
    }
    await _doc.loadInfo();
    return _doc;
}

/**
 * Tambah row baru ke Sheets.
 * Return: rowNumber (nomor baris di Sheets) untuk disimpan di MongoDB,
 * sehingga updateSheetStatus bisa update langsung tanpa load semua row.
 */
async function saveToSheets(data) {
    try {
        const doc = await getDoc();
        const sheet = doc.sheetsByIndex[0];

        const row = await sheet.addRow({
            'Tanggal':      new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' }),
            'ID Laporan':   data.reportId,
            'Nama':         data.nama || '-',
            'NIM':          data.nim || '-',
            'No HP':        data.phoneNumber || '-',
            'Kategori':     data.category,
            'Sub Kategori': data.subCategory,
            'Darurat':      data.isEmergency ? 'YA' : 'Tidak',
            'Status':       data.status || 'Masuk',
            'Keterangan':   data.keterangan || '-'
        });

        const rowNumber = row.rowNumber;
        console.log(`📊 [${data.reportId}] Tersimpan di Sheets baris ke-${rowNumber}`);
        return rowNumber; // dikembalikan ke handler untuk disimpan di MongoDB

    } catch (err) {
        console.error('❌ Gagal simpan ke Sheets:', err.message);
        _doc = null; // reset cache kalau koneksi error
        return null;
    }
}

/**
 * Update kolom Status langsung berdasarkan nomor baris.
 * Tidak perlu load semua row — jauh lebih cepat dan hemat API quota.
 */
async function updateSheetStatus(reportId, status, sheetRowNumber) {
    if (!sheetRowNumber) {
        console.warn(`⚠️ [${reportId}] sheetRowNumber tidak ada, skip update Sheets`);
        return;
    }

    try {
        const doc = await getDoc();
        const sheet = doc.sheetsByIndex[0];

        // offset = sheetRowNumber - 2 karena:
        // - baris 1 = header (di-skip otomatis oleh getRows)
        // - getRows offset 0 = baris data pertama (baris 2 di Sheets)
        // - jadi baris Sheets ke-N = offset (N - 2)
        const rows = await sheet.getRows({ offset: sheetRowNumber - 2, limit: 1 });

        if (rows.length === 0) {
            console.warn(`⚠️ [${reportId}] Baris ${sheetRowNumber} tidak ditemukan di Sheets`);
            return;
        }

        rows[0].set('Status', status);
        await rows[0].save();

        console.log(`📊 [${reportId}] Status diupdate ke "${status}" di baris ${sheetRowNumber}`);

    } catch (err) {
        console.error(`❌ Gagal update status Sheets [${reportId}]:`, err.message);
        _doc = null; // reset cache kalau koneksi error
    }
}

module.exports = { saveToSheets, updateSheetStatus };