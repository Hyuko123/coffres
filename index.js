// ================= CONFIG =================
const PREFIX = "+";
const STAFF_ROLE_ID = "1453489095493025904";
const TICKET_CATEGORY_ID = "1453488744744227007";

// ================= IMPORTS =================
const {
  Client,
  GatewayIntentBits,
  PermissionsBitField,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder
} = require("discord.js");

const {
  joinVoiceChannel,
  createAudioPlayer,
  createAudioResource
} = require("@discordjs/voice");

const play = require("play-dl");
const ms = require("ms");
const transcripts = require("discord-html-transcripts");

// ================= CLIENT =================
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildVoiceStates
  ]
});

// ================= MUSIQUE =================
let musicPlayer = null;
let voiceConnection = null;

// ================= READY =================
client.once("ready", () => {
  console.log("🔥 SunDay Bot connecté");
  client.user.setActivity("PvP Faction 🔥", { type: 3 });
});

// ================= COMMANDES =================
client.on("messageCreate", async message => {
  if (message.author.bot) return;
  if (!message.content.startsWith(PREFIX)) return;

  const args = message.content.slice(PREFIX.length).trim().split(/ +/);
  const command = args.shift().toLowerCase();

  // ================= PANEL TICKET =================
// ================= PANEL TICKET =================
if (command === "ticketpanel") {

  // Supprime le message de commande
  await message.delete().catch(() => {});

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("open_ticket")
      .setLabel("🎫 Ouvrir un ticket")
      .setStyle(ButtonStyle.Primary)
  );

  const embed = new EmbedBuilder()
    .setTitle("🎟️ SunDay Faction – Système de Tickets")
    .setDescription(`
👋 Bienvenue chez **SunDay** !

📌 **Types de tickets :**
❓ Question / Information  
🤝 Partenariat  
⚔️ Recrutement  
📩 Autre demande  

🔥 **Merci de décrire clairement ta demande.**
`)
    .setColor(0xff0000);

  return message.channel.send({ embeds: [embed], components: [row] });
}


  // ================= COMMANDES TICKET =================
  if (message.channel.name?.startsWith("ticket-")) {

    // CLOSE
    if (command === "close") {
      const attachment = await transcripts.createTranscript(message.channel, {
        limit: -1,
        filename: `${message.channel.name}.html`
      });

      const userId = message.channel.topic;
      if (userId) {
        const user = await client.users.fetch(userId);
        await user.send({
          content: "📄 Transcript de ton ticket SunDay",
          files: [attachment]
        });
      }

      return message.channel.delete();
    }

    // RENAME
    if (command === "rename" && args[0]) {
      return message.channel.setName(`ticket-${args[0]}`);
    }

    // ADD
    if (command === "add") {
      const member = message.mentions.members.first();
      if (!member) return;

      await message.channel.permissionOverwrites.edit(member.id, {
        ViewChannel: true,
        SendMessages: true
      });

      return message.channel.send(`➕ ${member} ajouté au ticket.`);
    }

    // REMOVE
    if (command === "remove") {
      const member = message.mentions.members.first();
      if (!member) return;

      await message.channel.permissionOverwrites.delete(member.id);
      return message.channel.send(`➖ ${member} retiré du ticket.`);
    }
  }

  // ================= GIVEAWAY =================
// ================= GIVEAWAY =================
if (command === "giveaway") {
  const duration = ms(args[0]);
  const reward = args.slice(1).join(" ");

  if (!duration || !reward) {
    return message.reply("❌ Utilisation : +giveaway <temps> <récompense>");
  }

  // Supprime le message de commande
  await message.delete().catch(() => {});

  const embed = new EmbedBuilder()
    .setTitle("🎉 GIVEAWAY SUNDAY 🎉")
    .setDescription(`
🎁 **Récompense**
> **${reward}**

⏰ **Fin dans**
> ${args[0]}

👥 Réagis avec 🎉 pour participer !
`)
    .setColor(0xff0000)
    .setTimestamp(Date.now() + duration);

  const msg = await message.channel.send({ embeds: [embed] });
  await msg.react("🎉");

  setTimeout(async () => {
    const reaction = msg.reactions.cache.get("🎉");
    if (!reaction) return;

    const users = (await reaction.users.fetch()).filter(u => !u.bot);
    if (!users.size) return message.channel.send("❌ Aucun participant.");

    const winner = users.random();
    message.channel.send(`🏆 **FÉLICITATIONS ${winner} !** Tu gagnes **${reward}**`);
  }, duration);
}


  // ================= ANNONCE =================
 // ================= ANNONCE =================
if (command === "annonce") {
  const texte = args.join(" ");
  if (!texte) return;

  // Supprime le message de commande
  await message.delete().catch(() => {});

  const embed = new EmbedBuilder()
    .setTitle("📢 Annonce SunDay")
    .setDescription(`
━━━━━━━━━━━━━━━━━━
${texte}
━━━━━━━━━━━━━━━━━━
`)
    .setColor(0xff0000)
    .setThumbnail(message.guild.iconURL({ dynamic: true }))
    .setTimestamp();

  return message.channel.send({ embeds: [embed] });
}

  // ================= MUSIQUE =================
  if (command === "play") {
    if (!message.member.voice.channel)
      return message.reply("❌ Tu dois être en vocal.");

    const stream = await play.stream(args[0]);
    const resource = createAudioResource(stream.stream, {
      inputType: stream.type
    });

    musicPlayer = createAudioPlayer();
    musicPlayer.play(resource);

    voiceConnection = joinVoiceChannel({
      channelId: message.member.voice.channel.id,
      guildId: message.guild.id,
      adapterCreator: message.guild.voiceAdapterCreator
    });

    voiceConnection.subscribe(musicPlayer);
    return message.reply("🎵 Musique lancée !");
  }

  if (command === "stop") {
    if (!musicPlayer) return message.reply("❌ Aucune musique.");
    musicPlayer.stop();
    voiceConnection.destroy();
    musicPlayer = null;
    voiceConnection = null;
    return message.reply("⏹ Musique arrêtée.");
  }

  if (command === "skip") {
    if (!musicPlayer) return message.reply("❌ Aucune musique.");
    musicPlayer.stop();
    return message.reply("⏭ Musique passée.");
  }
});

// ================= BOUTON TICKET =================
client.on("interactionCreate", async interaction => {
  if (!interaction.isButton()) return;
  if (interaction.customId !== "open_ticket") return;

  const existing = interaction.guild.channels.cache.find(
    c => c.parentId === TICKET_CATEGORY_ID && c.topic === interaction.user.id
  );

  if (existing) {
    return interaction.reply({
      content: `❌ Tu as déjà un ticket ouvert : ${existing}`,
      ephemeral: true
    });
  }

  const channel = await interaction.guild.channels.create({
    name: `ticket-${interaction.user.username}`,
    parent: TICKET_CATEGORY_ID,
    topic: interaction.user.id,
    permissionOverwrites: [
      {
        id: interaction.guild.id,
        deny: [PermissionsBitField.Flags.ViewChannel]
      },
      {
        id: interaction.user.id,
        allow: [
          PermissionsBitField.Flags.ViewChannel,
          PermissionsBitField.Flags.SendMessages
        ]
      },
      {
        id: STAFF_ROLE_ID,
        allow: [
          PermissionsBitField.Flags.ViewChannel,
          PermissionsBitField.Flags.SendMessages
        ]
      }
    ]
  });

  channel.send(`
🎫 **NOUVEAU TICKET**
👤 ${interaction.user}

Merci d’expliquer clairement ta demande.
`);

  interaction.reply({
    content: `✅ Ton ticket a été créé : ${channel}`,
    ephemeral: true
  });
});

// ================= LOGIN =================
client.login(process.env.TOKEN);


