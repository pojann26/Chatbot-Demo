require('dotenv').config();
const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion } = require('@whiskeysockets/baileys');
const { Boom } = require('@hapi/boom');
const qrcode = require('qrcode-terminal');
const mongoose = require('mongoose');
const pino = require('pino');
const { mongoURI } = require('./config');
const { handleMessage } = require('./bot/handler');

mongoose.connect(mongoURI)
    .then(() => console.log('✅ MongoDB: Terhubung'))
    .catch(err => { console.error('❌ MongoDB gagal:', err); process.exit(1); });

async function startBot() {
    const { state, saveCreds } = await useMultiFileAuthState('auth_info');
    const { version } = await fetchLatestBaileysVersion();

    const sock = makeWASocket({
        version,
        auth: state,
        logger: pino({ level: 'warn' }),
        printQRInTerminal: false,
        browser: ['Windows', 'Chrome', '11.0.0'],
        defaultQueryTimeoutMs: undefined,
        connectTimeoutMs: 60000
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect, qr } = update;
        if (qr) {
            console.log('--- SCAN QR CODE DI BAWAH INI ---');
            qrcode.generate(qr, { small: true });
        }
        if (connection === 'close') {
            const shouldReconnect = (lastDisconnect?.error instanceof Boom)?.output?.statusCode !== DisconnectReason.loggedOut;
            if (shouldReconnect) {
                console.log('🔄 Reconnecting...');
                startBot();
            } else {
                console.log('🔴 Bot logged out. Scan ulang QR.');
            }
        } else if (connection === 'open') {
            console.log('🚀 BOT WHATSAPP ONLINE!');
        }
    });

    sock.ev.on('messages.upsert', async (m) => {
        const msg = m.messages[0];
        if (!msg.message || msg.key.fromMe) return;

        const from = msg.key.remoteJid;
        if (from.endsWith('@g.us')) return;

        const text = (
            msg.message.conversation ||
            msg.message.extendedTextMessage?.text || ''
        ).toLowerCase().trim();

        if (!text) return;

        await handleMessage(sock, from, text);
    });
}

startBot();