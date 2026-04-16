require('dotenv').config();
const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion } = require('@whiskeysockets/baileys');
const { Boom } = require('@hapi/boom');
const qrcode = require('qrcode-terminal');
const mongoose = require('mongoose');
const pino = require('pino');

const { mongoURI } = require('./config');
const { handleMessage } = require('./bot/handler');

// --- KONEKSI DATABASE ---
mongoose.connect(mongoURI)
    .then(() => console.log('✅ MongoDB Terhubung'))
    .catch(err => {
        console.error('❌ Gagal koneksi MongoDB:', err.message);
        process.exit(1);
    });

// --- BOT ---
async function startBot() {
    const { state, saveCreds } = await useMultiFileAuthState('auth_info');
    const { version } = await fetchLatestBaileysVersion();

    const sock = makeWASocket({
        version,
        auth: state,
        logger: pino({ level: 'warn' }),
        printQRInTerminal: false,
        browser: ['Windows', 'Chrome', '11.0.0'],
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect, qr } = update;
        if (qr) {
            console.log('📱 Scan QR Code berikut:');
            qrcode.generate(qr, { small: true });
        }
        if (connection === 'close') {
            const shouldReconnect =
                (lastDisconnect?.error instanceof Boom)
                    ? lastDisconnect.error?.output?.statusCode !== DisconnectReason.loggedOut
                    : true;
            console.log('🔌 Koneksi terputus. Reconnect:', shouldReconnect);
            if (shouldReconnect) startBot();
        } else if (connection === 'open') {
            console.log('🚀 SobatCare BOT ONLINE!');
        }
    });

    sock.ev.on('messages.upsert', async (m) => {
        const msg = m.messages[0];
        if (!msg.message || msg.key.fromMe) return;

        const from = msg.key.remoteJid;
        if (from.endsWith('@g.us')) return; // Abaikan pesan grup

        const text =
            msg.message.conversation ||
            msg.message.extendedTextMessage?.text ||
            '';

        if (!text.trim()) return;

        try {
            await handleMessage(sock, from, text);
        } catch (err) {
            console.error(`❌ Error handleMessage [${from}]:`, err);
        }
    });
}

startBot();