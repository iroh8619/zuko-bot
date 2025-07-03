const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const SQLite = require('better-sqlite3');
const sql = new SQLite('./mainDB.sqlite');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('role-level')
    .setDescription('Manage role rewards for specific levels')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles | PermissionFlagsBits.ManageGuild)
    .addSubcommand(subcommand =>
      subcommand
        .setName('add')
        .setDescription('Set a role to be rewarded at a specific level')
        .addIntegerOption(option =>
          option.setName('level')
            .setDescription('The level to assign the role')
            .setRequired(true))
        .addRoleOption(option =>
          option.setName('role')
            .setDescription('The role to assign')
            .setRequired(true)))
    .addSubcommand(subcommand =>
      subcommand
        .setName('remove')
        .setDescription('Remove a role reward at a specific level')
        .addIntegerOption(option =>
          option.setName('level')
            .setDescription('The level to remove the role reward from')
            .setRequired(true)))
    .addSubcommand(subcommand =>
      subcommand
        .setName('show')
        .setDescription('Show all level-based role rewards')),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    const guildId = interaction.guild.id;

    if (sub === 'add') {
      const level = interaction.options.getInteger('level');
      const role = interaction.options.getRole('role');

      if (level < 1) {
        return interaction.reply({ content: 'Please provide a valid level (1 or higher).', ephemeral: true });
      }

      const getRole = sql.prepare("SELECT * FROM roles WHERE guildID = ? AND level = ?");
      const existing = getRole.get(guildId, level);

      const setRole = sql.prepare("INSERT OR REPLACE INTO roles (guildID, roleID, level) VALUES (?, ?, ?)");
      setRole.run(guildId, role.id, level);

      const action = existing ? 'updated' : 'set';
      const embed = new EmbedBuilder()
        .setTitle(`✅ Role ${action}`)
        .setDescription(`${role} has been ${action} for level ${level}.`)
        .setColor('Random');

      return interaction.reply({ embeds: [embed] });
    }

    if (sub === 'remove') {
      const level = interaction.options.getInteger('level');
      const getLevel = sql.prepare("SELECT * FROM roles WHERE guildID = ? AND level = ?");
      const found = getLevel.get(guildId, level);

      if (!found) {
        return interaction.reply({ content: 'There is no role set for that level.', ephemeral: true });
      }

      const del = sql.prepare("DELETE FROM roles WHERE guildID = ? AND level = ?");
      del.run(guildId, level);

      const embed = new EmbedBuilder()
        .setTitle('✅ Role Removed')
        .setDescription(`Role reward for level ${level} has been removed.`)
        .setColor('Random');

      return interaction.reply({ embeds: [embed] });
    }

    if (sub === 'show') {
      const all = sql.prepare("SELECT * FROM roles WHERE guildID = ?").all(guildId);

      if (!all.length) {
        return interaction.reply({ content: 'There are no level-role rewards set in this server.', ephemeral: true });
      }

      const embed = new EmbedBuilder()
        .setTitle(`${interaction.guild.name} Level Roles`)
        .setDescription('Use `/role-level add` to set new ones or `/role-level remove` to delete.')
        .setColor('Random');

      all.forEach(row => {
        embed.addFields({ name: `Level ${row.level}`, value: `<@&${row.roleID}>`, inline: true });
      });

      return interaction.reply({ embeds: [embed] });
    }
  }
};
