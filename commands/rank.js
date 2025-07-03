const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const SQLite = require('better-sqlite3');
const sql = new SQLite('./mainDB.sqlite');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('rank')
    .setDescription("Check a user's rank and XP")
    .addUserOption(option =>
      option.setName('user')
        .setDescription('The user to check rank for')
        .setRequired(false)
    ),

  async execute(interaction) {
    try {
      // ✅ Diffère la réponse pour éviter l'erreur "Unknown interaction"
      await interaction.deferReply({ ephemeral: true });

      const target = interaction.options.getMember('user') || interaction.member;

      const getScore = sql.prepare("SELECT * FROM levels WHERE user = ? AND guild = ?");
      const score = getScore.get(target.id, interaction.guild.id);

      if (!score) {
        return await interaction.editReply({ content: `${target.displayName} has no XP yet!` });
      }

      const topUsers = sql.prepare("SELECT * FROM levels WHERE guild = ? ORDER BY totalXP DESC").all(interaction.guild.id);
      const rank = topUsers.findIndex(u => u.user === target.id) + 1;

      const level = score.level;
      const nextXP = level * 2 * 250 + 250;

      const embed = new EmbedBuilder()
        .setColor('#FFD700')
        .setAuthor({
          name: target.displayName || target.user.username,
          iconURL: target.displayAvatarURL({ dynamic: true })
        })
        .setTitle('🏅 Rank Information')
        .addFields(
          { name: 'Level', value: level.toString(), inline: true },
          { name: 'XP', value: `${score.xp} / ${nextXP}`, inline: true },
          { name: 'Rank', value: `#${rank}`, inline: true }
        )
        .setThumbnail(interaction.guild.iconURL({ dynamic: true }))
        .setFooter({ text: `Server: ${interaction.guild.name}`, iconURL: interaction.guild.iconURL({ dynamic: true }) })
        .setTimestamp();

      // ✅ Utilise editReply au lieu de reply (car on a déjà différé)
      await interaction.editReply({ embeds: [embed] });

    } catch (error) {
      console.error("An error occurred in the rank command:", error);
      try {
        // ✅ Empêche double réponse si une erreur a déjà été envoyée
        if (interaction.deferred || interaction.replied) {
          await interaction.editReply({ content: "An error occurred while fetching the rank. Please try again later." });
        } else {
          await interaction.reply({ content: "An error occurred while fetching the rank. Please try again later.", ephemeral: true });
        }
      } catch (e) {
        console.error("Failed to send error reply:", e);
      }
    }
  }
};
