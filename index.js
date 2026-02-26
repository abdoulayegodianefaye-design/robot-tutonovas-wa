require('dotenv').config();
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const { createClient } = require('@supabase/supabase-js');

// --- 1. CONFIGURATION ---
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
const MON_NUMERO = '221777790392'; // 👈 REMPLACE PAR TON NUMÉRO (ex: 221771234567)

const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        headless: true,
        executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || '/usr/bin/chromium',
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
    }
});

const sessions = {};

// --- 2. STRATÉGIE COMMERCIALE (COPYWRITING) ---
const salesExpert = {
    bienvenue: `Bienvenue chez *Tutonovas*. 🎓\n\nNous ne nous contentons pas de donner des cours, nous bâtissons une vision pour l'avenir de votre enfant.\n\nPour vous orienter vers la solution la plus adaptée, quel est votre objectif prioritaire ?\n\n*1.* Viser l'excellence scolaire et une discipline de travail (Classique)\n*2.* Offrir un accompagnement spécialisé à un enfant aux besoins particuliers (Attention, comportement, langage)`,

    argumentaireClassique: `Le forfait *Classique* est le choix des parents qui veulent offrir à leur enfant un suivi sérieux, régulier et valorisant. 📚\n\nIci, votre enfant n'achète pas des heures de cours. Il intègre un cadre où il apprend à *penser*, à *s'organiser* et surtout à *reprendre confiance*.\n\n*Nos parcours (Mensuel) :*\n- *Primaire :* Dès 35 000 FCFA\n- *Collège :* Dès 45 000 FCFA\n- *Lycée :* Dès 50 000 FCFA\n\nC'est un investissement pour son avenir. Pour préparer son profil, en quelle classe est l'enfant ?`,

    argumentaireSpecifique: `Nous comprenons les défis que vous traversez. Chaque enfant mérite un regard expert et bienveillant. 🌟\n\nNos éducateurs spécialisés créent un "cocon éducatif" à domicile. En nous appuyant sur les bilans (orthophoniste, psy), nous transformons les blocages en victoires.\n\n*Nos programmes dédiés :*\n- *Sérénité :* 60 000 FCFA/mois\n- *Progrès :* 100 000 FCFA/mois\n- *Intensif :* 180 000 FCFA/mois\n\nPour mieux vous conseiller, pourriez-vous me décrire brièvement ses besoins ou son parcours ?`,

    domicile: `Absolument. 🏠 L'éducation à domicile est au cœur de notre méthode. C'est dans son environnement familial que l'enfant se sent le plus en confiance pour progresser sereinement. Nous intervenons partout à Dakar et zone VDN.`,

    doutes: `C'est une question légitime. Chez Tutonovas, nos tuteurs ne sont pas de simples répétiteurs : ils sont sélectionnés pour leur capacité à transmettre une *discipline de fer* dans un *gant de velours*. Chaque séance est un pas vers l'autonomie.`
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

    // A. RÉPONSES AUX MOTS-CLÉS (Vente Invisible)
    if (text.includes('tarif') || text.includes('prix') || text.includes('combien')) {
        await client.sendMessage(from, "Chez Tutonovas, l'éducation est un investissement durable. Voici nos parcours conçus pour la réussite :");
        await client.sendMessage(from, salesExpert.argumentaireClassique);
        await client.sendMessage(from, "--- OU ---");
        await client.sendMessage(from, salesExpert.argumentaireSpecifique);
        return;
    }

    if (text.includes('domicile') || text.includes('déplace') || text.includes('maison')) {
        return client.sendMessage(from, salesExpert.domicile + "\n\nSouhaitez-vous inscrire votre enfant ? (Répondez 1 ou 2)");
    }

    if (text.includes('efficace') || text.includes('garantie') || text.includes('mieux')) {
        return client.sendMessage(from, salesExpert.doutes);
    }

    // B. TUNNEL DE CONVERSION
    if (text.includes('bonjour') || text.includes('inscription') || text === 'salut' || text === 'info') {
        sessions[from] = { etape: 'orientation' };
        return client.sendMessage(from, salesExpert.bienvenue);
    }

    // ÉTAPE 1 : ORIENTATION
    if (sessions[from]?.etape === 'orientation') {
        if (text === '1') {
            sessions[from] = { etape: 'collecte', service: 'Classique' };
            return client.sendMessage(from, salesExpert.argumentaireClassique);
        }
        if (text === '2') {
            sessions[from] = { etape: 'collecte', service: 'Spécifique' };
            return client.sendMessage(from, salesExpert.argumentaireSpecifique);
        }
    }

    // ÉTAPE 2 : COLLECTE ET CLÔTURE
    if (sessions[from]?.etape === 'collecte') {
        const service = sessions[from].service;

        // 1. Sauvegarde Supabase
        await supabase.from('leads').insert([{ 
            phone_number: phone, 
            service_type: service, 
            details_enfant: msg.body, 
            statut: service === 'Spécifique' ? '🔥 URGENT' : 'À contacter' 
        }]);

        // 2. Alerte Commerciale pour Toi
        const alerte = `🎯 *NOUVEAU LEAD CONVAINCU* 🎯\n\n👤 *Parent :* ${phone}\n🎓 *Service :* ${service}\n📝 *Détails :* ${msg.body}\n\nAppelle-le vite pour conclure la vente !`;
        await client.sendMessage(`${MON_NUMERO}@c.us`, alerte);

        // 3. Message de fin rassurant
        await client.sendMessage(from, `C'est parfaitement noté. Je transmets personnellement votre demande à notre responsable pédagogique. \n\nVous avez pris une excellente décision pour son épanouissement. Un conseiller vous contactera très prochainement pour finaliser l'accompagnement.`);
        
        delete sessions[from];
    }
});

client.initialize();