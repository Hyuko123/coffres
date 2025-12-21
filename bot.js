const { Client, GatewayIntentBits, EmbedBuilder } = require('discord.js');
const fs = require('fs');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

const DATA_FILE = './coffre_data.json';

// Structure des données
let coffreData = {
    argent: 0,
    items: {}, // { "nom_item": quantite }
    historique: [] // { type, categorie, nom, quantite, raison, auteur, date }
};

// Charger les données au démarrage
function chargerDonnees() {
    if (fs.existsSync(DATA_FILE)) {
        const data = fs.readFileSync(DATA_FILE, 'utf8');
        coffreData = JSON.parse(data);
    }
}

// Sauvegarder les données
function sauvegarderDonnees() {
    fs.writeFileSync(DATA_FILE, JSON.stringify(coffreData, null, 2));
}

client.once('ready', () => {
    console.log(`✅ Bot connecté en tant que ${client.user.tag}`);
    chargerDonnees();
});

client.on('messageCreate', async message => {
    if (message.author.bot) return;

    const args = message.content.split(' ');
    const cmd = args[0].toLowerCase();

    // !ajouter argent [montant] [raison]
    if (cmd === '!ajouter' && args[1] === 'argent') {
        const montant = parseInt(args[2]);
        if (isNaN(montant) || montant <= 0) {
            return message.reply('❌ Montant invalide ! Utilise : `!ajouter argent [montant] [raison]`');
        }
        const raison = args.slice(3).join(' ') || 'Aucune raison';
        
        coffreData.argent += montant;
        coffreData.historique.push({
            type: 'ajout',
            categorie: 'argent',
            montant: montant,
            raison: raison,
            auteur: message.author.tag,
            date: new Date().toLocaleString('fr-FR')
        });
        sauvegarderDonnees();
        
        message.reply(`✅ **${montant} argent** ajouté au coffre !\n📝 Raison : ${raison}\n💰 Nouveau solde : **${coffreData.argent}**`);
    }

    // !ajouter item [nom] [quantite] [raison]
    else if (cmd === '!ajouter' && args[1] === 'item') {
        if (args.length < 4) {
            return message.reply('❌ Utilise : `!ajouter item "Nom Item" [quantite] [raison]`');
        }
        
        // Extraire le nom de l'item entre guillemets
        const msgText = message.content;
        const match = msgText.match(/!ajouter item "(.*?)" (\d+)(.*)/);
        
        if (!match) {
            return message.reply('❌ Format invalide ! Utilise : `!ajouter item "Nom Item" [quantite] [raison]`');
        }
        
        const nomItem = match[1];
        const quantite = parseInt(match[2]);
        const raison = match[3].trim() || 'Aucune raison';
        
        if (!coffreData.items[nomItem]) {
            coffreData.items[nomItem] = 0;
        }
        coffreData.items[nomItem] += quantite;
        
        coffreData.historique.push({
            type: 'ajout',
            categorie: 'item',
            nom: nomItem,
            quantite: quantite,
            raison: raison,
            auteur: message.author.tag,
            date: new Date().toLocaleString('fr-FR')
        });
        sauvegarderDonnees();
        
        message.reply(`✅ **${quantite}x ${nomItem}** ajouté au coffre !\n📝 Raison : ${raison}\n📦 Total : **${coffreData.items[nomItem]}x**`);
    }

    // !retirer argent [montant] [raison]
    else if (cmd === '!retirer' && args[1] === 'argent') {
        const montant = parseInt(args[2]);
        if (isNaN(montant) || montant <= 0) {
            return message.reply('❌ Montant invalide ! Utilise : `!retirer argent [montant] [raison]`');
        }
        if (montant > coffreData.argent) {
            return message.reply(`❌ Fonds insuffisants ! Solde actuel : **${coffreData.argent}**`);
        }
        const raison = args.slice(3).join(' ') || 'Aucune raison';
        
        coffreData.argent -= montant;
        coffreData.historique.push({
            type: 'retrait',
            categorie: 'argent',
            montant: montant,
            raison: raison,
            auteur: message.author.tag,
            date: new Date().toLocaleString('fr-FR')
        });
        sauvegarderDonnees();
        
        message.reply(`✅ **${montant} argent** retiré du coffre !\n📝 Raison : ${raison}\n💰 Nouveau solde : **${coffreData.argent}**`);
    }

    // !retirer item [nom] [quantite] [raison]
    else if (cmd === '!retirer' && args[1] === 'item') {
        const msgText = message.content;
        const match = msgText.match(/!retirer item "(.*?)" (\d+)(.*)/);
        
        if (!match) {
            return message.reply('❌ Format invalide ! Utilise : `!retirer item "Nom Item" [quantite] [raison]`');
        }
        
        const nomItem = match[1];
        const quantite = parseInt(match[2]);
        const raison = match[3].trim() || 'Aucune raison';
        
        if (!coffreData.items[nomItem] || coffreData.items[nomItem] < quantite) {
            return message.reply(`❌ Stock insuffisant ! Stock actuel de "${nomItem}" : **${coffreData.items[nomItem] || 0}x**`);
        }
        
        coffreData.items[nomItem] -= quantite;
        if (coffreData.items[nomItem] === 0) {
            delete coffreData.items[nomItem];
        }
        
        coffreData.historique.push({
            type: 'retrait',
            categorie: 'item',
            nom: nomItem,
            quantite: quantite,
            raison: raison,
            auteur: message.author.tag,
            date: new Date().toLocaleString('fr-FR')
        });
        sauvegarderDonnees();
        
        message.reply(`✅ **${quantite}x ${nomItem}** retiré du coffre !\n📝 Raison : ${raison}\n📦 Restant : **${coffreData.items[nomItem] || 0}x**`);
    }

    // !coffre - Récap complet
    else if (cmd === '!coffre') {
        const embed = new EmbedBuilder()
            .setColor('#FFD700')
            .setTitle('🏛️ Coffre du Serveur')
            .setTimestamp();
        
        // Argent
        embed.addFields({ name: '💰 Argent', value: `**${coffreData.argent}**`, inline: false });
        
        // Items
        const itemsList = Object.entries(coffreData.items);
        if (itemsList.length > 0) {
            const itemsText = itemsList.map(([nom, qte]) => `**${qte}x** ${nom}`).join('\n');
            embed.addFields({ name: '📦 Items', value: itemsText, inline: false });
        } else {
            embed.addFields({ name: '📦 Items', value: '*Aucun item*', inline: false });
        }
        
        // Stats
        embed.addFields({ 
            name: '📊 Statistiques', 
            value: `Total transactions : **${coffreData.historique.length}**`, 
            inline: false 
        });
        
        message.channel.send({ embeds: [embed] });
    }

    // !historique - Historique détaillé
    else if (cmd === '!historique') {
        if (coffreData.historique.length === 0) {
            return message.reply('📋 Aucune transaction enregistrée.');
        }
        
        const derniers = coffreData.historique.slice(-10).reverse();
        const embed = new EmbedBuilder()
            .setColor('#3498db')
            .setTitle('📜 Historique des Transactions')
            .setDescription(`*Affichage des ${derniers.length} dernières transactions*`)
            .setTimestamp();
        
        derniers.forEach((entry, i) => {
            const emoji = entry.type === 'ajout' ? '➕' : '➖';
            let titre = `${emoji} ${entry.type.toUpperCase()}`;
            let valeur = '';
            
            if (entry.categorie === 'argent') {
                valeur = `**${entry.montant}** argent\n`;
            } else {
                valeur = `**${entry.quantite}x** ${entry.nom}\n`;
            }
            
            valeur += `📝 ${entry.raison}\n`;
            valeur += `👤 Par ${entry.auteur}\n`;
            valeur += `🕒 ${entry.date}`;
            
            embed.addFields({ name: titre, value: valeur, inline: false });
        });
        
        message.channel.send({ embeds: [embed] });
    }

    // !aide - Guide des commandes
    else if (cmd === '!aide' || cmd === '!help') {
        const embed = new EmbedBuilder()
            .setColor('#2ecc71')
            .setTitle('📚 Guide du Coffre')
            .setDescription('Voici toutes les commandes disponibles :')
            .addFields(
                { name: '💰 Argent', value: 
                    '`!ajouter argent [montant] [raison]`\n' +
                    '`!retirer argent [montant] [raison]`', 
                    inline: false 
                },
                { name: '📦 Items', value: 
                    '`!ajouter item "Nom Item" [quantité] [raison]`\n' +
                    '`!retirer item "Nom Item" [quantité] [raison]`', 
                    inline: false 
                },
                { name: '📊 Consultation', value: 
                    '`!coffre` - Voir le récapitulatif\n' +
                    '`!historique` - Voir les dernières transactions\n' +
                    '`!aide` - Afficher cette aide', 
                    inline: false 
                },
                { name: '💡 Exemple', value: 
                    '`!ajouter item "Épée légendaire" 3 Trouvé en raid`\n' +
                    '`!retirer argent 500 Achat de potions`', 
                    inline: false 
                }
            );
        
        message.channel.send({ embeds: [embed] });
    }
});

// Remplace par ton token
client.login(process.env.TOKEN);