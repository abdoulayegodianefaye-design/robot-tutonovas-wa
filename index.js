require('dotenv').config();
const { Client, LocalAuth } = require('whatsapp-web.js');
const { createClient } = require('@supabase/supabase-js');

// --- 1. CONFIGURATION ---
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
const MON_NUMERO = '221761638398'; 

const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        headless: true,
        executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || '/usr/bin/chromium',
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
    }
});

const sessions = {};

// --- 2. BASE DE CONNAISSANCES HUMAINE ---
const expertAnswers = {
    classique: `Le forfait *Classique* est conçu pour transformer la scolarité en un parcours de réussite. Dès 35 000 FCFA/mois, votre enfant bénéficie d'un encadrement structuré qui lui redonne confiance et méthode.`,
    
    specifique: `Pour les besoins particuliers, nous créons un véritable "cocon éducatif". Nos éducateurs s'adaptent au rythme de l'enfant (autisme, TDAH, langage) dès 60 000 FCFA/mois pour un suivi sur-mesure.`,
    
    domicile: `Absolument, nous intervenons directement chez vous. 🏠 C'est dans son environnement familial, là où il est le plus à l'aise, que l'enfant progresse le mieux.`,
    
    methode: `Notre approche n'est pas de faire de la simple répétition. Nous transmettons une discipline de travail et une envie d'apprendre qui resteront gravées bien après les cours.`
};

// --- 3. LOGIQUE DU BOT ---
client.on('qr', (qr) => {
    console.log('SCANNEZ CE LIEN : https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=' + encodeURIComponent(qr));
});

client.on('ready', () => console.log('🚀 Expert Commercial Tutonovas Opérationnel !'));

client.on('message', async (msg) => {
    const from = msg.from;
    const text = msg.body.toLowerCase();
    const phone = from.split('@')[0];

    // Éviter de répondre à soi-même ou aux groupes
    if (from.includes('@g.us') || phone === MON_NUMERO) return;

    // A. RÉPONSES PRÉCISES AUX QUESTIONS (L'Expert qui écoute)
    
    // Question sur les TARIFS
    if (text.includes('tarif') || text.includes('prix') || text.includes('combien') || text.includes('coûte')) {
        await client.sendMessage(from, "Je comprends que l'aspect financier soit important. Chez Tutonovas, nous proposons deux approches selon les besoins de votre enfant :");
        await client.sendMessage(from, `1️⃣ *Soutien Classique :* ${expertAnswers.classique}`);
        await client.sendMessage(from, `2️⃣ *Éducation Spécialisée :* ${expertAnswers.specifique}`);
        return client.sendMessage(from, "Lequel de ces deux suivis vous semble le plus adapté à votre situation ? (Répondez 1 ou 2)");
    }

    // Question sur le DOMICILE
    if (text.includes('domicile') || text.includes('déplace') || text.includes('maison') || text.includes('où')) {
        return client.sendMessage(from, `${expertAnswers.domicile}\n\nSouhaitez-vous que l'on discute d'une inscription ?`);
    }

    // Question sur la MÉTHODE / EFFICACITÉ
    if (text.includes('comment') || text.includes('efficace') || text.includes('garantie') || text.includes('mieux')) {
        return client.sendMessage(from, `${expertAnswers.methode}\n\nPour quelle classe cherchez-vous une solution ?`);
    }

    // B. TUNNEL DE CONVERSION (L'Expert qui guide)
    if (text.includes('bonjour') || text.includes('salut') || text === 'info' || text.includes('inscription')) {
        sessions[from] = { etape: 'orientation' };
        return client.sendMessage(from, `Bonjour ! C'est un plaisir d'échanger avec vous. 🎓\n\nChez *Tutonovas*, nous aidons chaque enfant à révéler son potentiel. Pour mieux vous conseiller, quel est votre besoin ?\n\n*1.* Excellence scolaire & discipline (Classique)\n*2.* Besoin particulier / Handicap (Spécialisé)`);
    }

    // ÉTAPE 1 : RÉPONSE AU CHOIX 1 OU 2
    if (sessions[from]?.etape === 'orientation') {
        if (text === '1') {
            sessions[from] = { etape: 'collecte', service: 'Classique' };
            return client.sendMessage(from, `Excellent choix. Le suivi classique apporte une vraie sérénité aux parents.\n\nEn quelle classe est votre enfant et quelles sont ses difficultés actuelles ?`);
        }
        if (text === '2') {
            sessions[from] = { etape: 'collecte', service: 'Spécifique' };
            return client.sendMessage(from, `Je comprends tout à fait. Ce type d'accompagnement demande beaucoup de bienveillance.\n\nPourriez-vous me décrire brièvement ses besoins ou son parcours pour que je prépare son dossier ?`);
        }
    }

    // ÉTAPE 2 : COLLECTE ET CLÔTURE (Le Closing)
    if (sessions[from]?.etape === 'collecte') {
        const service = sessions[from].service;

        // Sauvegarde Supabase
        await supabase.from('leads').insert([{ 
            phone_number: phone, 
            service_type: service, 
            details_enfant: msg.body, 
            statut: service === 'Spécifique' ? '🔥 URGENT' : 'À contacter' 
        }]);

        // Alerte Commerciale pour Toi
        const alerte = `🎯 *NOUVEAU LEAD TUTONOVAS* 🎯\n👤 *Parent :* ${phone}\n🎓 *Service :* ${service}\n📝 *Détails :* ${msg.body}`;
        await client.sendMessage(`${MON_NUMERO}@c.us`, alerte);

        await client.sendMessage(from, `C'est parfaitement noté. Je transmets vos informations à notre responsable pédagogique dès maintenant.\n\nVous avez pris une belle décision pour son avenir. Un conseiller vous appellera très bientôt pour finaliser tout cela. ✨`);
        
        delete sessions[from];
    }
});

client.initialize();