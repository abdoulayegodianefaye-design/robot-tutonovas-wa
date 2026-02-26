require('dotenv').config(); // Charge le coffre-fort
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const { createClient } = require('@supabase/supabase-js');

// --- 1. CONFIGURATION SUPABASE (SÉCURISÉE) ---
const supabaseUrl = process.env.SUPABASE_URL; 
const supabaseKey = process.env.SUPABASE_KEY; 
const supabase = createClient(supabaseUrl, supabaseKey);

// ... (Le reste de ton code ne change pas)

// --- 2. INITIALISATION DU ROBOT ---
const client = new Client({
    authStrategy: new LocalAuth(),
    authTimeoutMs: 60000,
    puppeteer: {
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-extensions']
    }
});

const sessions = {}; 

// --- 3. GÉNÉRATION DU QR CODE ---
client.on('qr', (qr) => {
    console.log('--------------------------------------------------');
    console.log('SCANNEZ CE CODE POUR TUTONOVAS');
    qrcode.generate(qr, { small: true });
    console.log('--------------------------------------------------');
});

client.on('ready', () => {
    console.log('🚀 Robot Tutonovas en ligne et opérationnel !');
});

// --- 4. LOGIQUE DE FILTRAGE ET DIALOGUE ---
client.on('message', async (msg) => {
    // SÉCURITÉ : Ignorer les statuts et les diffusions pour ne pas polluer tes stories
    if (msg.from === 'status@broadcast' || msg.broadcast) return;

    const from = msg.from;
    const messageRecu = msg.body.toLowerCase();
    const estUnGroupe = from.includes('@g.us');
    
    // CORRECTION NUMÉRO : On garde uniquement les chiffres (ex: 22177...)
    const phone = from.split('@')[0]; 

    if (estUnGroupe) return;

    // A. ÉTAPE 0 : DÉTECTION NOUVEAU PARENT
    if (!sessions[from]) {
        const motsClesParents = ['inscription', 'inscrire', 'enfant', 'fils', 'fille', 'cours', 'soutien', 'classe', 'besoin', 'tarif', 'autiste', 'autisme', 'trisomie', 'retard'];
        const motsClesTravail = ['travail', 'emploi', 'recrutement', 'enseigner', 'cv', 'poste'];

        const estParent = motsClesParents.some(mot => messageRecu.includes(mot));
        const estTravail = motsClesTravail.some(mot => messageRecu.includes(mot));

        if (estParent && !estTravail) {
            sessions[from] = { etape: 'choix_service' };
            
            const menu = `🎓 *Bienvenue chez Tutonovas !* \n\n` +
                         `Pour vous aider au mieux, quel service recherchez-vous ?\n\n` +
                         `1️⃣ *Soutien Scolaire Classique* (Cours, devoirs, examens)\n` +
                         `2️⃣ *Besoins Spécifiques* (Autisme, Retard de langage, Trisomie, etc.)\n\n` +
                         `Répondez par *1* ou *2*.`;
            
            await client.sendMessage(from, menu);
            await supabase.from('leads').insert([{ phone_number: phone, message: msg.body, statut: 'En cours' }]);
            return;
        } 
        
        if (estTravail) {
            await client.sendMessage(from, "Bonjour, nous ne recrutons pas par WhatsApp. Merci d'envoyer votre CV par email à contact@tutonovas.com.");
            return;
        }
    }

    // B. ÉTAPE 1 : CHOIX DU SERVICE
    if (sessions[from] && sessions[from].etape === 'choix_service') {
        if (msg.body === '1') {
            sessions[from].service = 'Classique';
            sessions[from].etape = 'collecte_details';
            await client.sendMessage(from, "Très bien. Quel est le prénom de l'enfant et sa classe actuelle ?");
        } 
        else if (msg.body === '2') {
            sessions[from].service = 'Spécifique';
            sessions[from].etape = 'collecte_details';
            await client.sendMessage(from, "Nous comprenons parfaitement. ❤️\n\nPourriez-vous nous préciser la nature du besoin de l'enfant (Autisme, langage, trisomie ou autre) ? Nos experts reviendront vers vous.");
        } else {
            await client.sendMessage(from, "Veuillez répondre par *1* ou *2* pour continuer l'inscription.");
        }
        return;
    }

    // C. ÉTAPE 2 : COLLECTE DES DÉTAILS ET FIN
    if (sessions[from] && sessions[from].etape === 'collecte_details') {
        const service = sessions[from].service;
        
        const { error } = await supabase
            .from('leads')
            .update({ 
                service_type: service,
                details_enfant: msg.body,
                statut: service === 'Spécifique' ? 'URGENT - Spécialisé' : 'À appeler'
            })
            .eq('phone_number', phone)
            .eq('statut', 'En cours');

        if (!error) {
            await client.sendMessage(from, `Merci ! Vos informations ont été transmises à notre équipe ${service === 'Spécifique' ? 'spécialisée' : 'pédagogique'}. \n\nUn conseiller va vous appeler sur ce numéro très prochainement. À bientôt !`);
            console.log(`✅ Dossier ${service} terminé pour : ${phone}`);
        }
        delete sessions[from];
    }
});

client.initialize();