const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('help')
    .setDescription('Display help information for all commands or a specific command')
    .addStringOption(option =>
      option.setName('command')
        .setDescription('Get detailed info about a specific command')
        .setRequired(false)
    ),

  async execute(interaction) {
    const input = interaction.options.getString('command');
    const commands = interaction.client.commands;

    if (!input) {
      const helpEmbed = new EmbedBuilder()
        .setColor('Random')
        .setAuthor({ name: `${interaction.guild.name} Help Menu`, iconURL: interaction.guild.iconURL() })
        .addFields(
          {
            name: 'Leveling Commands',
            value: '`/rank`, `/resetrank`, `/leaderboard`, `/role-level`, `/add-level`'
          },
          {
            name: 'Configuration Commands',
            value: '`/set-prefix`'
          }
        )
        .setTimestamp()
        .setFooter({ text: '<> is mandatory, [] is optional' });

      return interaction.reply({ embeds: [helpEmbed], ephemeral: true });
    }

    const name = input.toLowerCase();
    const command = commands.get(name);

    if (!command) {
      return interaction.reply({ content: `That’s not a valid command!`, ephemeral: true });
    }

    const detailsEmbed = new EmbedBuilder()
      .setTitle(command.data.name.charAt(0).toUpperCase() + command.data.name.slice(1))
      .setColor('Random')
      .setDescription([
        `**Command Name**: ${command.data.name}`,
        `**Description**: ${command.data.description || 'None'}`,
        `**Category**: ${command.category || 'General'}`,
        `**Aliases**: ${command.aliases ? command.aliases.join(', ') : 'None'}`,
        `**Cooldown**: ${command.cooldown || 'None'}`
      ].join('\n'))
      .setFooter({ text: 'Help command' });

    return interaction.reply({ embeds: [detailsEmbed], ephemeral: true });
  }
};
