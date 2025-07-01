const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const fetch = require('node-fetch');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('zukoyoutube')
    .setDescription('Fetch the latest YouTube video from Uncle Iroh\'s channel'),

  async execute(interaction) {
    const apiKey = 'AIzaSyB0Xm35jREkbxfa4l7vpcJ4gOFXa4x1y2o'; // Replace with your YouTube API key
    const channelId = 'UC5VgXW1vFTnQCi5szh7R-qw'; // Replace with your channel ID
    const url = `https://www.googleapis.com/youtube/v3/search?key=${apiKey}&channelId=${channelId}&part=snippet,id&order=date&maxResults=1`;

    try {
      const res = await fetch(url);
      const data = await res.json();

      if (!data.items || !data.items.length) {
        return interaction.reply('No recent videos found.');
      }

      const video = data.items[0];
      const videoId = video.id.videoId;
      const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;

      const introMessages = [
  "<@&964096937630498859> Uncle Iroh said something again. It’s probably deep. I guess you should watch it. 🔥",
  "<@&964096937630498859> I’m not saying he’s right *all the time*... but this one actually made sense. Check it out. 🍵",
  "<@&964096937630498859> Great. More Iroh wisdom. Because *clearly* we all need guidance or whatever. 🎴",
  "<@&964096937630498859> Uncle said this could help someone. So if you're a disaster like me, maybe it's for you. 🔥",
  "<@&964096937630498859> Iroh dropped another gem. He didn’t say it was optional. Just watch it. ✨",
  "<@&964096937630498859> Look, if ignoring him worked, I’d do it. It doesn’t. Here's the video. 🍵",
  "<@&964096937630498859> Iroh said you should watch this. I didn’t argue. I’ve learned my lesson. 🔥",
  "<@&964096937630498859> New Iroh wisdom just came in. I don’t *get* it yet... but maybe you will. 🎴",
  "<@&964096937630498859> He said this one was ‘important for your inner peace.’ Sounds like a trap. Click it. ✨",
  "<@&964096937630498859> Iroh keeps talking and somehow it keeps helping. Watch this before I change my mind. 🍵",
  "<@&964096937630498859> Another day, another life lesson from the old firebender. Don’t ignore it. Trust me. 🔥",
  "<@&964096937630498859> Uncle made me send this. Apparently *everyone* needs to hear it. Even you. ✨",
  "<@&964096937630498859> This video might just fix you. Or confuse you. Either way, Uncle said watch it. 🍵",
  "<@&964096937630498859> If you’ve messed something up recently, this might help. Iroh’s words, not mine. 🔥",
  "<@&964096937630498859> New wisdom update from the tea philosopher himself. You know what to do. ✨",
  "<@&964096937630498859> Don’t roll your eyes—it’s actually good. Iroh dropped another one. 🍵",
  "<@&964096937630498859> You don't have to listen to him... but why wouldn't you? He’s literally never wrong. 🔥",
  "<@&964096937630498859> This one's short but powerful. Kinda like the time Iroh made me cry over soup. Watch it. ✨",
  "<@&964096937630498859> Iroh’s been thinking again. The result? This. You’re welcome. 🍵",
  "<@&964096937630498859> Another quiet punch to the soul from Uncle Iroh. Watch it and feel things. 🔥",
  "<@&964096937630498859> Iroh said if I *don’t* send this, I’ll regret it. So here. Video. Now. ✨",
  "<@&964096937630498859> Even if you think you’ve got it all figured out, just… listen to Uncle. Trust me. 🍵",
  "<@&964096937630498859> This one's about peace or destiny or... something big. Just click it before I overthink. 🔥",
  "<@&964096937630498859> Uncle’s at it again. Dropping advice like it’s hot tea. Try not to spill it. ✨",
  "<@&964096937630498859> Not everything he says makes sense at first. But this? This one hit different. Watch it. 🍵"
      ];
      const intro = introMessages[Math.floor(Math.random() * introMessages.length)];

      const embed = new EmbedBuilder()
        .setTitle(video.snippet.title)
        .setDescription(video.snippet.description || 'No description provided.')
        .setURL(videoUrl)
        .setImage(video.snippet.thumbnails.high.url)
        .setColor('#FF0000')
        .setTimestamp();

      await interaction.reply(intro);
      await interaction.followUp({ embeds: [embed] });

      // Send reminder to another channel
      const reminderChannelId = '1014249897756729454';
      const reminderChannel = interaction.guild.channels.cache.get(reminderChannelId);
      if (reminderChannel) {
        reminderChannel.send("✍️ Hey <@707124653482836009>, don't forget to write a <#1103963545978273842> today. Uncle would be proud.");
      }

    } catch (err) {
      console.error('YouTube API error:', err);
      return interaction.reply({ content: '❌ Could not fetch the video. Please try again later.', ephemeral: true });
    }
  }
};
