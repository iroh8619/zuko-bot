if (typeof ReadableStream === 'undefined') {
const { ReadableStream } = require('web-streams-polyfill');
  global.ReadableStream = ReadableStream;
}



const { Client, GatewayIntentBits, Partials, Collection, Events, EmbedBuilder } = require('discord.js');
const { readdirSync } = require('fs');
const { join } = require('path');
const express = require('express');
const SQLite = require('better-sqlite3');
const fetch = require('node-fetch');
const config = require('./config.json');


const sql = new SQLite('/data/mainDB.sqlite');
const app = express();
const port = process.env.PORT || 3000;

app.get('/', (_, res) => res.send('Bot is alive!'));
app.listen(port, () => console.log(`Web server listening on port ${port}`));

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers
  ],
  partials: [Partials.Message, Partials.Channel, Partials.Reaction]
});

client.commands = new Collection();
const talkedRecently = new Map();


// Load commands from ./commands
const commandFiles = readdirSync(join(__dirname, 'commands')).filter(file => file.endsWith('.js'));
for (const file of commandFiles) {
  const command = require(`./commands/${file}`);
  if ('data' in command && 'execute' in command) {
    client.commands.set(command.data.name, command);
  }
}

// Database table creation
function initializeDatabase() {
  if (!sql.prepare(`SELECT count(*) FROM sqlite_master WHERE type='table' AND name='levels'`).get()['count(*)']) {
    sql.prepare(`CREATE TABLE levels (id TEXT PRIMARY KEY, user TEXT, guild TEXT, xp INTEGER, level INTEGER, totalXP INTEGER);`).run();
  }
  if (!sql.prepare(`SELECT count(*) FROM sqlite_master WHERE type='table' AND name='roles'`).get()['count(*)']) {
    sql.prepare(`CREATE TABLE roles (guildID TEXT, roleID TEXT, level INTEGER);`).run();
  }
  if (!sql.prepare(`SELECT count(*) FROM sqlite_master WHERE type='table' AND name='prefix'`).get()['count(*)']) {
    sql.prepare(`CREATE TABLE prefix (serverprefix TEXT, guild TEXT PRIMARY KEY);`).run();
  }

  client.getLevel = sql.prepare("SELECT * FROM levels WHERE user = ? AND guild = ?");
  client.setLevel = sql.prepare("INSERT OR REPLACE INTO levels (id, user, guild, xp, level, totalXP) VALUES (@id, @user, @guild, @xp, @level, @totalXP);");
}


client.once(Events.ClientReady, () => {
  console.log(`Logged in as ${client.user.tag}`);
  
   const activities = [
    { name: 'Uncle making tea', type: 3 },
    { name: '/help', type: 3 },     // Watching
  ];

  let currentIndex = 0;

  // Function to update activity
  function updateActivity() {
    const activity = activities[currentIndex];
    client.user.setActivity(activity.name, { type: activity.type });

    // Move to the next activity
    currentIndex = (currentIndex + 1) % activities.length;
  }

  // Set initial activity and then alternate every 10 seconds
  updateActivity();
  setInterval(updateActivity, 10000);
  initializeDatabase();
});

// Slash Command Handling
client.on(Events.InteractionCreate, async interaction => {
  if (!interaction.isChatInputCommand()) return;
  const command = client.commands.get(interaction.commandName);
  if (!command) return;

  try {
    await command.execute(interaction, sql);
  } catch (error) {
    console.error(error);
    await interaction.reply({ content: 'There was an error executing this command.', ephemeral: true });
  }
});

const fs = require('fs');

function updateUserJSON(guildId) {
  const users = sql.prepare("SELECT * FROM levels WHERE guild = ? ORDER BY totalXP DESC").all(guildId);
  if (!users.length) return;

  const leaderboard = users.map((entry, index) => {
    const nextXP = entry.level * 2 * 250 + 250;
    return {
      rank: index + 1,
      userId: entry.user,
      level: entry.level,
      xp: entry.xp,
      totalXP: entry.totalXP,
      nextXP
    };
  });

  fs.writeFileSync('./users.json', JSON.stringify(leaderboard, null, 2));
}


// Message-based XP System
client.on(Events.MessageCreate, async message => {
  if (message.author.bot || !message.guild) return;

  let level = client.getLevel.get(message.author.id, message.guild.id);
  if (!level) {
    sql.prepare("INSERT OR REPLACE INTO levels (id, user, guild, xp, level, totalXP) VALUES (?, ?, ?, ?, ?, ?)").run(
      `${message.author.id}-${message.guild.id}`, message.author.id, message.guild.id, 0, 0, 0
    );
    return;
  }

  const xpGain = Math.floor(Math.random() * 400) + 100;
  const nextLevelXp = level.level * 2 * 250 + 250;

  level.xp += xpGain;
  level.totalXP += xpGain;

  if (level.xp >= nextLevelXp) {
    level.xp -= nextLevelXp;
    level.level += 1;

const zukoQuotes = [
  `🔥 ${message.author} reached **Level ${level.level}**... and honestly? That's one step closer to *finally* getting Dad to say "good job" — maybe.`,
  `🔥 **Level ${level.level}**?! Are you kidding me?! You're actually doing it! You’re… not a disappointment?!`,
  `🔥 ${message.author}, **Level ${level.level}**… You’re leveling up faster than my emotional damage.`,
  `🔥 I didn’t banish myself for *nothing!* Keep going. **Level ${level.level}**.`,
  `🔥 **Level ${level.level}**. That’s not just progress. That’s *growth*. Disgusting. I’m proud of you.`,
  `🔥 ${message.author}, you hit **Level ${level.level}** and no one even had to throw lightning at you. Impressive.`,
  `🔥 **Level ${level.level}**. Azula’s shaking in her boots. And they’re *very expensive* boots.`,
  `🔥 I spent *years* chasing the Avatar... you're out here chasing **Level ${level.level}** like it owes you money. Respect.`,
  `🔥 ${message.author}, you did not wake up and choose peace. You chose VIOLENCE. **Level ${level.level}**.`,
  `🔥 **Level ${level.level}**. You’ve burned through doubt, fear, and probably your eyebrows. Keep it up.`,
  `🔥 Listen... I used to think honor came from my father. But you? You just got it from **Level ${level.level}**. Even better.`,
  `🔥 ${message.author}, if I had a gold coin for every level you gained… I could finally open my own tea shop. **Level ${level.level}**.`,
  `🔥 **Level ${level.level}**. You’re on fire! Like literally. Are you okay? Is that smoke??`,
  `🔥 Wow. **Level ${level.level}**. I haven't been this surprised since Uncle Iroh told me tea wasn't dinner.`,
  `🔥 ${message.author}, you're hotter than blue fire right now! **Level ${level.level}** and rising!`,
  `🔥 **Level ${level.level}**. You've unlocked something powerful. Maybe... self-worth?! GASP.`,
  `🔥 You’ve come a long way from yelling at clouds. **Level ${level.level}** looks good on you.`,
  `🔥 **Level ${level.level}**. You didn’t find yourself — you *built* yourself. Like a firebender with IKEA instructions.`,
  `🔥 You’re not just leveling up, ${message.author}. You’re rewriting your whole redemption arc. **Level ${level.level}**!`,
  `🔥 Every level leaves a scar. But this one? This one looks kinda badass. Wear it proud. **Level ${level.level}**.`
];



const zukoMessage = zukoQuotes[Math.floor(Math.random() * zukoQuotes.length)];
message.reply(zukoMessage);


    const member = message.member;
const roleLevels = JSON.parse(fs.readFileSync('./rolelevels.json', 'utf8'));

// Find matching role for the new level
const matchingRole = roleLevels.find(r => r.level === level.level);
if (matchingRole) {
  const role = message.guild.roles.cache.get(matchingRole.roleId);
  if (role && !member.roles.cache.has(role.id)) {
    // Remove all lower-level roles listed in the file
    const lowerRoles = roleLevels.filter(r => r.level < level.level);
    for (const r of lowerRoles) {
      const oldRole = message.guild.roles.cache.get(r.roleId);
      if (oldRole && member.roles.cache.has(oldRole.id)) {
        await member.roles.remove(oldRole).catch(console.error);
      }
    }

    await member.roles.add(role.id).catch(console.error);
    await message.author.send(`A secret message from my uncle: Congratulations my friend! You've reached **Level ${level.level}** and received the title **${role.name}**!`).catch(() => {});
  }
}

  }

  client.setLevel.run(level);
  updateUserJSON(message.guild.id);
  talkedRecently.set(message.author.id, Date.now() + 10 * 1000);
  setTimeout(() => talkedRecently.delete(message.author.id), 10 * 1000);
});

client.login(process.env.DISCORD_TOKEN);
