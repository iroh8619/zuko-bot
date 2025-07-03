const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const fs = require('fs');
const dbDir = '/data';
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir);
}

const SQLite = require('better-sqlite3');
const sql = new SQLite('/data/mainDB.sqlite');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('set-prefix')
    .setDescription('Set a custom server prefix for commands')
    .addStringOption(option =>
      option.setName('prefix')
        .setDescription('The new prefix to use')
        .setRequired(true)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  async execute(interaction) {
    const newPrefix = interaction.options.getString('prefix');
    const guildId = interaction.guild.id;

    const currentPrefix = sql.prepare("SELECT serverprefix FROM prefix WHERE guild = ?").get(guildId)?.serverprefix;

    if (!newPrefix) {
      return interaction.reply({ content: 'Please provide a new prefix.', ephemeral: true });
    }

    if (newPrefix === currentPrefix) {
      return interaction.reply({ content: 'That prefix is already in use. Please provide a new one.', ephemeral: true });
    }

    sql.prepare("INSERT OR REPLACE INTO prefix (serverprefix, guild) VALUES (?, ?);").run(newPrefix, guildId);

    return interaction.reply(`✅ Server prefix is now set to \`${newPrefix}\``);
  }
};
