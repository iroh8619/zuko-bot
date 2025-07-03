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
    console.log('➡️ /rank command started');
    try {
      // Accuse réception rapidement (obligatoire si traitement > 3s)
      await interaction.deferReply({ ephemeral: true });

      const target = interaction.options.getMember('user') || interaction.member;

      const getScore = sql.prepare(`
        SELECT * FROM levels WHERE user = ? AND guild = ?
      `);
      const score = getScore.get(target.id, interaction.guild.id);

      if (!score) {
        return await interaction.editReply({
          content: `${target.displayName || target.user.username} has no XP yet!`
        });
      }

      const topUsers = sql.prepare(`
        SELECT user FROM levels WHERE guild = ? ORDER BY totalXP DESC
      `).all(interaction.guild.id);

      const rank = topUsers.findIndex(u => u.user === target.id) + 1;
      const nextXP = score.level * 2 * 250 + 250;

      const embed = new EmbedBuilder()
        .setColor(0xFFD700)
        .setAuthor({
          name: target.displayName || target.user.username,
          iconURL: target.displayAvatarURL({ dynamic: true })
        })
        .setTitle('🏅 Rank Information')
        .addFields(
          { name: 'Level', value: `${score.level}`, inline: true },
          { name: 'XP', value: `${score.xp} / ${nextXP}`, inline: true },
          { name: 'Rank', value: `#${rank}`, inline: true }
        )
        .setThumbnail(interaction.guild.iconURL({ dynamic: true }))
        .setFooter({
          text: `Server: ${interaction.guild.name}`,
          iconURL: interaction.guild.iconURL({ dynamic: true })
        })
        .setTimestamp();

      return await interaction.editReply({ embeds: [embed] });

    } catch (error) {
      console.error('❌ Error in /rank:', error);

      // Gère proprement les erreurs de réponse déjà envoyée
      if (interaction.deferred || interaction.replied) {
        return interaction.editReply({
          content: 'An error occurred while fetching the rank. Please try again later.'
        }).catch(console.error);
      } else {
        return interaction.reply({
          content: 'An error occurred while fetching the rank. Please try again later.',
          ephemeral: true
        }).catch(console.error);
      }
    }
  }
};
