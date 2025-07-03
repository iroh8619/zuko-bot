const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const SQLite = require('better-sqlite3');
const sql = new SQLite('/data/mainDB.sqlite');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('resetrank')
    .setDescription('Resets the rank (level and XP) of everyone in the server.')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    const guildId = interaction.guild.id;

    try {
      // Reset all levels and XP
      const reset = sql.prepare("UPDATE levels SET xp = 0, level = 0, totalXP = 0 WHERE guild = ?");
      reset.run(guildId);

      // Optionally clean up zeroed entries
      const cleanup = sql.prepare("DELETE FROM levels WHERE guild = ? AND xp = 0 AND level = 0 AND totalXP = 0");
      cleanup.run(guildId);

      await interaction.reply('✅ All ranks in this server have been successfully reset!');
    } catch (error) {
      console.error("Error resetting ranks:", error);
      await interaction.reply({ content: '❌ There was an error resetting the ranks. Please try again later.', ephemeral: true });
    }
  }
};
