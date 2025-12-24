const {
  Client,
  GatewayIntentBits,
  PermissionsBitField,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder
} = require("discord.js");

const { joinVoiceChannel, createAudioPlayer, createAudioResource } = require("@discordjs/voice");
const play = require("play-dl");
const ms = require("ms");
const transcripts = require("discord-html-transcripts");

// ================= CLIENT =================

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildVoiceStates
  ]
});

// ================= MUSIQUE =================

let musicPlayer;

// ================= READY =================

client.once("ready", () => {
  console.log("🔥 SunDay Bot connecté");
  client.user.setActivity("PvP Faction 🔥", { type: 3 });
});

// ================= MESSAGE =================

client.on("messageCreate", async message => {
  if (message.author.bot) return;
  if (!message.content.startsWith(PREFIX)) return;

  const args = message.content.slice(PREFIX.length).trim().split(/ +/);
  const command = args.shift().toLowerCase();

  // ================= PANEL TICKET =================

  if (command === "ticketpanel") {
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("open_ticket")
        .setLabel("🎫 Ouvrir un ticket")
        .setStyle(ButtonStyle.Primary)
    );

    const embed = new EmbedBuilder()
      .setTitle("🎫 Support SunDay")
      .setDescription("Clique sur le bouton pour ouvrir un ticket PvP Faction")
      .setColor(0xff0000);

    message.channel.send({ embeds: [embed], components: [row] });
  }

  // ================= COMMANDES TICKET =================

  if (command === "ticket") {

    // CLOSE
    if (args[0] === "close") {
      if (!message.channel.name.startsWith("ticket-")) return;

      const attachment = await transcripts.createTranscript(message.channel, {
        limit: -1,
        filename: `${message.channel.name}.html`
      });

      await message.author.send({
        content: "📄 Transcript de ton ticket SunDay",
        files: [attachment]
      });

      message.channel.delete();
    }

    // RENAME
    if (args[0] === "rename") {
      if (!args[1]) return;
      message.channel.setName(`ticket-${args[1]}`);
    }

    // ADD USER
    if (args[0] === "add") {
      const member = message.mentions.members.first();
      if (!member) return;

      message.channel.permissionOverwrites.edit(member.id, {
        ViewChannel: true,
        SendMessages: true
      });

      message.reply(`✅ ${member.user.username} ajouté au ticket`);
    }
  }

  // ================= GIVEAWAY =================

  if (command === "giveaway") {
    if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) return;

    const duration = ms(args[0]);
    const title = args[1];
    const reward = args.slice(2).join(" ");

    if (!duration || !reward) return;

    const embed = new EmbedBuilder()
      .setTitle(`🎉 GIVEAWAY : ${title}`)
      .setDescription(`🎁 Récompense : **${reward}**\n⏰ Fin dans : ${args[0]}`)
      .setColor(0xff0000)
      .setFooter({ text: "SunDay PvP Faction" });

    const msg = await message.channel.send({ embeds: [embed] });
    await msg.react("🎉");

    setTimeout(async () => {
      const reaction = msg.reactions.cache.get("🎉");
      const users = (await reaction.users.fetch()).filter(u => !u.bot);
      const winner = users.random();

      message.channel.send(
        winner
          ? `🏆 Bravo ${winner} ! Tu gagnes **${reward}**`
          : "❌ Aucun participant"
      );
    }, duration);
  }

  // ================= ANNONCE =================

  if (command === "annonce") {
    if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) return;

    const embed = new EmbedBuilder()
      .setTitle("📢 Annonce SunDay")
      .setDescription(args.join(" "))
      .setColor(0xff0000)
      .setFooter({ text: "SunDay PvP Faction" });

    message.channel.send({ embeds: [embed] });
  }

  // ================= MUSIQUE =================

  if (command === "play") {
    if (!message.member.voice.channel) return;

    const stream = await play.stream(args[0]);
    const resource = createAudioResource(stream.stream);

    musicPlayer = createAudioPlayer();
    musicPlayer.play(resource);

    joinVoiceChannel({
      channelId: message.member.voice.channel.id,
      guildId: message.guild.id,
      adapterCreator: message.guild.voiceAdapterCreator
    }).subscribe(musicPlayer);

    message.reply("🎵 Musique lancée");
  }

  if (command === "stop") {
    if (musicPlayer) musicPlayer.stop();
    message.reply("⏹ Musique arrêtée");
  }

  if (command === "skip") {
    if (musicPlayer) musicPlayer.stop();
    message.reply("⏭ Musique skip");
  }
});

// ================= INTERACTIONS BOUTONS =================

client.on("interactionCreate", async interaction => {
  if (!interaction.isButton()) return;

  if (interaction.customId === "open_ticket") {
    const channel = await interaction.guild.channels.create({
      name: `ticket-${interaction.user.username}`,
      parent: TICKET_CATEGORY_ID,
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

    interaction.reply({ content: "🎫 Ticket créé !", ephemeral: true });
  }
});

// ================= LOGIN =================

client.login(process.env.TOKEN);
