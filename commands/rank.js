const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');
const dbDir = path.join(__dirname, 'data');
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir);
}

const SQLite = require('better-sqlite3');
const sql = new SQLite(path.join(dbDir, 'mainDB.sqlite'));

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
      const target = interaction.options.getMember('user') || interaction.member;

      const getScore = sql.prepare("SELECT * FROM levels WHERE user = ? AND guild = ?");
      const score = getScore.get(target.id, interaction.guild.id);

      if (!score) {
        return interaction.reply({ content: `${target.displayName} has no XP yet!`, ephemeral: true });
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

      await interaction.reply({ embeds: [embed] });

    } catch (error) {
      console.error("An error occurred in the rank command:", error);
      interaction.reply({ content: "An error occurred while fetching the rank. Please try again later.", ephemeral: true });
    }
  }
};
