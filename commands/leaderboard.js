const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const SQLite = require('better-sqlite3');
const sql = new SQLite('./mainDB.sqlite');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('leaderboard')
    .setDescription('Check top users with the most XP and the highest level'),

  async execute(interaction) {
    const top10 = sql.prepare("SELECT * FROM levels WHERE guild = ? ORDER BY totalXP DESC;").all(interaction.guild.id);

    if (top10.length < 1) {
      return interaction.reply({ content: 'The leaderboard is empty! Start earning XP to appear here.', ephemeral: true });
    }

    const totalPages = Math.ceil(top10.length / 10);
    let currentPage = 1;

const buildEmbed = async (page) => {
  const start = (page - 1) * 10;
  const end = start + 10;
  const pageData = top10.slice(start, end);

  const embed = new EmbedBuilder()
    .setTitle(`${interaction.guild.name} Server Ranking`)
    .setColor('Random')
    .setThumbnail('https://i.imghippo.com/files/YfWD3097aY.png')
    .setFooter({ text: `Page ${page} / ${totalPages}` })
    .setTimestamp();

  for (const [index, entry] of pageData.entries()) {
    const userId = entry.user;
    const nextXP = entry.level * 2 * 250 + 250;
    const rank = start + index + 1;

    let displayName;
    try {
      const member = await interaction.guild.members.fetch(userId).catch(() => null);
      displayName = member.displayName;
    } catch {
      displayName = `<@${userId}>`; // fallback to mention
    }

    const medal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : '🏅';

    embed.addFields({
      name: `${medal} ${rank}. ${displayName}`,
      value: `- **Level**: ${entry.level}\n- **XP**: ${entry.xp} / ${nextXP}`
    });
  }

  return embed;
};


    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('prev').setLabel('⬅️').setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId('next').setLabel('➡️').setStyle(ButtonStyle.Primary)
    );

    const message = await interaction.reply({
      embeds: [await buildEmbed(currentPage)],
      components: totalPages > 1 ? [row] : [],
      fetchReply: true,
      ephemeral: false
    });

    if (totalPages <= 1) return;

    const collector = message.createMessageComponentCollector({
      time: 60000,
      filter: i => i.user.id === interaction.user.id
    });

    collector.on('collect', async i => {
      if (i.customId === 'prev' && currentPage > 1) currentPage--;
      if (i.customId === 'next' && currentPage < totalPages) currentPage++;

      await i.update({
        embeds: [await buildEmbed(currentPage)],
        components: [row]
      });
    });

    collector.on('end', async () => {
      if (message.editable) {
        await message.edit({ components: [] });
      }
    });
  }
};