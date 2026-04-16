const { GoogleSpreadsheet } = require('google-spreadsheet');
const { JWT } = require('google-auth-library');
const creds = require('../google-key.json');
const { spreadsheetId } = require('../config');

async function saveToSheets(data) {
    try {
        const serviceAccountAuth = new JWT({
            email: creds.client_email,
            key: creds.private_key,
            scopes: ['https://www.googleapis.com/auth/spreadsheets'],
        });

        const doc = new GoogleSpreadsheet(spreadsheetId, serviceAccountAuth);
        await doc.loadInfo();
        const sheet = doc.sheetsByIndex[0];

        await sheet.addRow({
            'Tanggal': new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' }),
            'ID Laporan': data.reportId,
            'Nama': data.nama || '-',
            'NIM': data.nim || '-',
            'No HP': data.phoneNumber || '-',
            'Kategori': data.category,
            'Sub Kategori': data.subCategory,
            'Darurat': data.isEmergency ? 'YA' : 'Tidak',
            'Status': data.status || 'Masuk',
            'Keterangan': data.keterangan || '-'
        });

        console.log(`📊 [${data.reportId}] Data masuk ke Google Sheets`);
    } catch (err) {
        console.error('❌ Gagal simpan ke Sheets:', err.message);
    }
}

async function updateSheetStatus(reportId, status) {
    try {
        const serviceAccountAuth = new JWT({
            email: creds.client_email,
            key: creds.private_key,
            scopes: ['https://www.googleapis.com/auth/spreadsheets'],
        });

        const doc = new GoogleSpreadsheet(spreadsheetId, serviceAccountAuth);
        await doc.loadInfo();
        const sheet = doc.sheetsByIndex[0];
        const rows = await sheet.getRows();

        const row = rows.find(r => r.get('ID Laporan') === reportId);
        if (row) {
            row.set('Status', status);
            await row.save();
            console.log(`📊 [${reportId}] Status diupdate: ${status}`);
        }
    } catch (err) {
        console.error('❌ Gagal update status Sheets:', err.message);
    }
}

module.exports = { saveToSheets, updateSheetStatus };