const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const SQLite = require('better-sqlite3');
const sql = new SQLite('./mainDB.sqlite');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('rank')
    .setDescription("Check a user's rank and XP")
    .addUserOption(o => o.setName('user').setDescription('The user').setRequired(false)),

async execute(interaction) {
  console.log(`➡️ /rank started (${interaction.id})`);

  // Sanity check: exit early if interaction is already expired
  if (!interaction || !interaction.isChatInputCommand()) return;

  try {
    await interaction.deferReply({ ephemeral: false });
  } catch (err) {
    console.error('❌ Failed to defer interaction:', err);
    return; // Interaction likely expired or already handled
  }

  try {
    const target = interaction.options.getMember('user') || interaction.member;

    const score = sql.prepare("SELECT * FROM levels WHERE user = ? AND guild = ?")
      .get(target.id, interaction.guild.id);

    if (!score) {
      return await interaction.editReply({
        content: `${target.displayName || target.user.username} has no XP yet!`
      });
    }

    const top = sql.prepare("SELECT user, totalXP FROM levels WHERE guild = ? ORDER BY totalXP DESC").all(interaction.guild.id);
    const rank = top.findIndex(u => u.user === target.id) + 1;
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
      .setFooter({
        text: interaction.guild.name,
        iconURL: interaction.guild.iconURL({ dynamic: true })
      })
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });

  } catch (err) {
    console.error('❌ Error in /rank:', err);
    if (interaction.deferred || interaction.replied) {
      await interaction.editReply({ content: 'Une erreur est survenue.' }).catch(console.error);
    } else {
      await interaction.reply({ content: 'Une erreur est survenue.', ephemeral: true }).catch(console.error);
    }
  }
}

};
