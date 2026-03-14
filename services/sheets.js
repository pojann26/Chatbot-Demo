const { GoogleSpreadsheet } = require('google-spreadsheet');
const { JWT } = require('google-auth-library');
const creds = require('../google-key.json');
const { spreadsheetId } = require('../config');

async function saveToSheets(data) {
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
        'Kategori': data.category,
        'Sub Kategori': data.subCategory
    });
}

module.exports = { saveToSheets };