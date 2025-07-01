const { SlashCommandBuilder, PermissionFlagsBits, AttachmentBuilder } = require('discord.js');

const SENTENCES = [
  "Here's something for you!",
  "A moment captured in pixels.",
  "From the gallery with love.",
  "Smile! 📸",
];

const CHANNEL_ID = '1014249897756729454';
const ROLE_ID = '964096791178010635';
const OWNER_ID = '707124653482836009';

module.exports = {
  data: new SlashCommandBuilder()
    .setName('life-advice')
    .setDescription('Owner-only: Posts a provided photo URL to a specific channel.')
    .addStringOption(option =>
      option.setName('url')
        .setDescription('Direct image URL to post')
        .setRequired(true)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    if (interaction.user.id !== OWNER_ID) {
      return interaction.reply({ content: "❌ You don't have permission to use this command.", ephemeral: true });
    }

    const imageUrl = interaction.options.getString('url');
    const randomSentence = SENTENCES[Math.floor(Math.random() * SENTENCES.length)];

    const targetChannel = await interaction.client.channels.fetch(CHANNEL_ID);
    if (!targetChannel || targetChannel.type !== 0) {
      return interaction.reply({ content: "❌ Target channel not found or invalid.", ephemeral: true });
    }

    await interaction.deferReply({ ephemeral: true });

    try {
      await targetChannel.send({
        content: `<@&${ROLE_ID}> ${randomSentence}`,
        files: [{ attachment: imageUrl }]
      });

      return interaction.editReply({ content: "✅ Your photo has been sent to the channel!" });
    } catch (err) {
      console.error("Send failed:", err);
      return interaction.editReply({ content: "❌ Failed to send the photo." });
    }
  }
};