require('dotenv').config();
const { Client, LocalAuth } = require('whatsapp-web.js');
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
const MON_NUMERO = '221761638398'; 

const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        headless: true,
        protocolTimeout: 60000,
        executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || '/usr/bin/chromium',
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu']
    }
});

const sessions = {};

client.on('qr', (qr) => {
    console.log('SCANNEZ CE LIEN : https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=' + encodeURIComponent(qr));
});

client.on('ready', () => console.log('🚀 Assistant Tutonovas Opérationnel !'));

client.on('message', async (msg) => {
    const from = msg.from;
    const text = msg.body.toLowerCase();
    const phone = from.split('@')[0];

    if (from.includes('@g.us') || phone === MON_NUMERO) return;

    console.log(`📩 Nouveau message de ${phone}: ${text}`);

    // --- FILTRE SITE WEB ---
    if (text.includes('site') || text.includes('www.tutonovas.com')) {
        return client.sendMessage(from, "Vous pouvez consulter l'ensemble de nos services et notre vision sur : 🌐 www.tutonovas.com");
    }

    // --- FILTRE RECRUTEMENT ---
    if (text.includes('recrute') || text.includes('emploi') || text.includes('travail') || text.includes('cv')) {
        return client.sendMessage(from, "Bonjour. Pour toute candidature, merci d'envoyer votre CV à : *recrutement@tutonovas.com*. Nos équipes RH traitent les demandes exclusivement par mail.");
    }

    // --- QUALIFICATION INITIALE ---
    if (!sessions[from] && (text.includes('bonjour') || text.includes('info') || text.includes('renseignement') || text.includes('bonsoir'))) {
        sessions[from] = { etape: 'accueil' };
        return client.sendMessage(from, "Bonjour ! Ravi de vous lire. 😊\n\nPour mieux vous orienter, quel est l'objet de votre demande ?\n\n1️⃣ Accompagnement scolaire pour un élève\n2️⃣ Question administrative ou message pour la direction\n3️⃣ Autre demande");
    }

    // --- LOGIQUE DE TRI ---
    if (sessions[from]?.etape === 'accueil') {
        if (text === '1' || text.includes('élève') || text.includes('cours')) {
            sessions[from].etape = 'choix_service';
            return client.sendMessage(from, "Entendu. S'agit-il d'un soutien scolaire classique ou d'un besoin en éducation spécialisée ?");
        } else if (text === '2' || text === '3' || text.includes('responsable')) {
            sessions[from].etape = 'message_direction';
            return client.sendMessage(from, "Je comprends. Afin que je puisse transmettre votre demande au responsable, pourriez-vous me préciser l'objet précis de votre message ?");
        }
    }

    // --- FILTRE DIRECTION ---
    if (sessions[from]?.etape === 'message_direction') {
        await client.sendMessage(`${MON_NUMERO}@c.us`, `⚠️ *MESSAGE DIRECTION* ⚠️\n👤 : ${phone}\n📝 OBJET : ${msg.body}`);
        await client.sendMessage(from, "C'est bien reçu. Votre message a été transmis à la direction. Vous serez recontacté prochainement. ✨");
        delete sessions[from];
        return;
    }

    // --- TUNNEL LEAD ---
    if (sessions[from]?.etape === 'choix_service') {
        if (text.includes('classique')) {
            sessions[from] = { etape: 'collecte', service: 'Classique' };
            return client.sendMessage(from, "Parfait. En quelle classe est l'élève et quelles sont les matières à renforcer ?");
        } else if (text.includes('spécialisé')) {
            sessions[from] = { etape: 'collecte', service: 'Spécialisé' };
            return client.sendMessage(from, "D'accord. Pourriez-vous me décrire brièvement ses besoins spécifiques ?");
        }
    }

    // --- CLÔTURE LEAD ---
    if (sessions[from]?.etape === 'collecte') {
        const type = sessions[from].service;
        await supabase.from('leads').insert([{ phone_number: phone, service_type: type, details_enfant: msg.body }]);
        await client.sendMessage(`${MON_NUMERO}@c.us`, `🎯 *NOUVEAU LEAD* 🎯\n👤 : ${phone}\n🎓 : ${type}\n📝 : ${msg.body}`);
        await client.sendMessage(from, "Merci beaucoup. J'ai transmis ces éléments au responsable pédagogique. Un conseiller vous contactera très prochainement.");
        delete sessions[from];
    }
});

client.initialize();