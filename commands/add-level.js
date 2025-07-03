const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const fs = require('fs');
const dbDir = '/data';
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir);
}

const SQLite = require('better-sqlite3');
const sql = new SQLite('/data/mainDB.sqlite');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('add-level')
    .setDescription('Give or add a level to a specified user')
    .addUserOption(option =>
      option.setName('user')
        .setDescription('The user to give levels to')
        .setRequired(true)
    )
    .addIntegerOption(option =>
      option.setName('amount')
        .setDescription('Amount of levels to add')
        .setRequired(true)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  async execute(interaction) {
    const user = interaction.options.getMember('user');
    const levelArgs = interaction.options.getInteger('amount');

    if (!user) {
      return interaction.reply({ content: 'Please specify a valid user.', ephemeral: true });
    }

    if (isNaN(levelArgs) || levelArgs < 1) {
      return interaction.reply({ content: 'Please provide a valid positive number.', ephemeral: true });
    }

    const getScore = sql.prepare("SELECT * FROM levels WHERE user = ? AND guild = ?");
    const setScore = sql.prepare("INSERT OR REPLACE INTO levels (id, user, guild, xp, level, totalXP) VALUES (@id, @user, @guild, @xp, @level, @totalXP);");

    let score = getScore.get(user.id, interaction.guild.id);
    if (!score) {
      score = {
        id: `${interaction.guild.id}-${user.id}`,
        user: user.id,
        guild: interaction.guild.id,
        xp: 0,
        level: 0,
        totalXP: 0
      };
    }

    score.level += levelArgs;
    const newTotalXP = (levelArgs - 1) * 2 * 250 + 250;
    score.totalXP += newTotalXP;

    setScore.run(score);

    const embed = new EmbedBuilder()
      .setTitle('✅ Success!')
      .setDescription(`Successfully added **${levelArgs}** level(s) to ${user.toString()}!`)
      .setColor('Random');

    return interaction.reply({ embeds: [embed] });
  }
};
