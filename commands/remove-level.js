const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const SQLite = require('better-sqlite3');
const sql = new SQLite('./mainDB.sqlite');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('remove-level')
    .setDescription('Remove or decrease level from a specified user')
    .addUserOption(option =>
      option.setName('user')
        .setDescription('The user to remove levels from')
        .setRequired(true)
    )
    .addIntegerOption(option =>
      option.setName('amount')
        .setDescription('The number of levels to remove')
        .setRequired(true)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  async execute(interaction) {
    const user = interaction.options.getMember('user');
    const levelToRemove = interaction.options.getInteger('amount');

    if (!user) {
      return interaction.reply({ content: 'Please mention a valid user.', ephemeral: true });
    }

    if (isNaN(levelToRemove) || levelToRemove < 1) {
      return interaction.reply({ content: 'Please provide a valid level amount to remove.', ephemeral: true });
    }

    const getScore = sql.prepare("SELECT * FROM levels WHERE user = ? AND guild = ?");
    const setScore = sql.prepare("INSERT OR REPLACE INTO levels (id, user, guild, xp, level, totalXP) VALUES (@id, @user, @guild, @xp, @level, @totalXP);");

    let score = getScore.get(user.id, interaction.guild.id);
    if (!score) {
      return interaction.reply({ content: 'This user does not have any XP or levels yet.', ephemeral: true });
    }

    if (score.level - levelToRemove < 1) {
      return interaction.reply({ content: 'You cannot remove levels that result in less than level 1.', ephemeral: true });
    }

    score.level -= levelToRemove;
    score.totalXP -= (levelToRemove - 1) * 2 * 250 + 250;
    setScore.run(score);

    const embed = new EmbedBuilder()
      .setTitle('✅ Success!')
      .setDescription(`Successfully removed **${levelToRemove}** level(s) from ${user.toString()}!`)
      .setColor('Random');

    return interaction.reply({ embeds: [embed] });
  }
};
