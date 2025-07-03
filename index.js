if (typeof ReadableStream === 'undefined') {
  const { ReadableStream } = require('web-streams-polyfill');
  global.ReadableStream = ReadableStream;
}

const { Client, GatewayIntentBits, Partials, Collection, Events } = require('discord.js');
const { readdirSync, writeFileSync, readFileSync } = require('fs');
const { join } = require('path');
const express = require('express');
const SQLite = require('better-sqlite3');
const fetch = require('node-fetch');
const crypto = require('crypto');

const sql = new SQLite('./mainDB.sqlite');
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

// 📦 Load commands
const commandFiles = readdirSync(join(__dirname, 'commands')).filter(file => file.endsWith('.js'));
for (const file of commandFiles) {
  const command = require(`./commands/${file}`);
  if (command.data && command.execute) {
    client.commands.set(command.data.name, command);
  }
}

// 🧱 Setup DB
function initializeDatabase() {
  const tableDefinitions = [
    { name: 'levels', sql: `CREATE TABLE levels (id TEXT PRIMARY KEY, user TEXT, guild TEXT, xp INTEGER, level INTEGER, totalXP INTEGER)` },
    { name: 'roles', sql: `CREATE TABLE roles (guildID TEXT, roleID TEXT, level INTEGER)` },
    { name: 'prefix', sql: `CREATE TABLE prefix (serverprefix TEXT, guild TEXT PRIMARY KEY)` }
  ];
  for (const table of tableDefinitions) {
    const exists = sql.prepare(`SELECT count(*) AS c FROM sqlite_master WHERE type='table' AND name=?`).get(table.name).c;
    if (!exists) sql.prepare(table.sql).run();
  }

  client.getLevel = sql.prepare("SELECT * FROM levels WHERE user = ? AND guild = ?");
  client.setLevel = sql.prepare("INSERT OR REPLACE INTO levels (id, user, guild, xp, level, totalXP) VALUES (@id, @user, @guild, @xp, @level, @totalXP)");
}

function syncFromUsersJSON(guildId) {
  try {
    const raw = readFileSync('./user.json', 'utf-8');
    let leaderboard;

    try {
      leaderboard = JSON.parse(raw);
    } catch (err) {
      console.error('❌ user.json est invalide. Corrige manuellement ce fichier.');
      console.error(err.message);
      return;
    }

    for (const user of leaderboard) {
      const id = `${user.userId}-${guildId}`;
      client.setLevel.run({
        id,
        user: user.userId,
        guild: guildId,
        xp: user.xp,
        level: user.level,
        totalXP: user.totalXP
      });
    }

    console.log('📥 Database synchronized from user.json');
  } catch (e) {
    console.error('❌ Failed to sync from user.json:', e);
  }
}


const { execSync } = require('child_process');

client.once(Events.ClientReady, () => {

  console.log(`Logged in as ${client.user.tag}`);
  initializeDatabase();
  syncFromUsersJSON('905876133151637575');

  const activities = [
    { name: 'Uncle making tea', type: 3 },
    { name: '/help', type: 3 },
  ];

  let index = 0;
  setInterval(() => {
    const act = activities[index++ % activities.length];
    client.user.setActivity(act.name, { type: act.type });
  }, 10000);
});


// ⬆️ Update GitHub with users.json
async function updateUserJSON(guildId) {
  sql.pragma('wal_checkpoint(TRUNCATE)');
  const users = sql.prepare("SELECT * FROM levels WHERE guild = ? ORDER BY totalXP DESC").all(guildId);
  if (!users.length) return;

  const leaderboard = users.map((u, i) => ({
    rank: i + 1,
    userId: u.user,
    level: u.level,
    xp: u.xp,
    totalXP: u.totalXP,
    nextXP: u.level * 2 * 250 + 250
  }));

  const content = JSON.stringify(leaderboard, null, 2);
  const filePath = './user.json';
  writeFileSync(filePath + '.tmp', content);
  require('fs').renameSync(filePath + '.tmp', filePath);


  const githubToken = process.env.GITHUB_TOKEN;
  const githubRepo = 'iroh8619/zuko-bot';
  const githubFilePath = 'user.json';

  try {
    const res = await fetch(`https://api.github.com/repos/${githubRepo}/contents/${githubFilePath}`, {
      headers: {
        Authorization: `token ${githubToken}`,
        Accept: 'application/vnd.github.v3+json'
      }
    });
    const data = await res.json();

    const oldContent = Buffer.from(data.content, 'base64').toString();
    if (crypto.createHash('sha256').update(oldContent).digest('hex') === crypto.createHash('sha256').update(content).digest('hex')) {
      return console.log("⚠️ No changes in user.json");
    }

    await fetch(`https://api.github.com/repos/${githubRepo}/contents/${githubFilePath}`, {
      method: 'PUT',
      headers: {
        Authorization: `token ${githubToken}`,
        Accept: 'application/vnd.github.v3+json'
      },
      body: JSON.stringify({
        message: 'update XP leaderboard',
        content: Buffer.from(content).toString('base64'),
        sha: data.sha
      })
    });

    console.log('✅ user.json updated on GitHub');
  } catch (e) {
    console.error('❌ GitHub update failed:', e);
  }
}

// 🧠 Slash command handling
client.on(Events.InteractionCreate, async interaction => {
  if (!interaction.isChatInputCommand()) return;
  const command = client.commands.get(interaction.commandName);
  if (!command) return;

  let deferred = false;
  const timer = setTimeout(async () => {
    if (!interaction.deferred && !interaction.replied) {
      deferred = true;
      await interaction.deferReply({ ephemeral: true }).catch(() => {});
    }
  }, 2000);

  try {
    await command.execute(interaction, sql);
  } catch (err) {
    console.error(`❌ Error in /${interaction.commandName}:`, err);
    if (interaction.deferred || interaction.replied || deferred) {
      await interaction.editReply({ content: 'Erreur. Réessaie plus tard.' }).catch(() => {});
    } else {
      await interaction.reply({ content: 'Erreur. Réessaie plus tard.', ephemeral: true }).catch(() => {});
    }
  } finally {
    clearTimeout(timer);
  }
});

// 🔥 XP System
client.on(Events.MessageCreate, async message => {
  if (message.author.bot || !message.guild) return;

  let level = client.getLevel.get(message.author.id, message.guild.id);
  if (!level) {
    client.setLevel.run({ id: `${message.author.id}-${message.guild.id}`, user: message.author.id, guild: message.guild.id, xp: 0, level: 0, totalXP: 0 });
    return;
  }

  const xpGain = Math.floor(Math.random() * 400) + 100;
  const nextXP = level.level * 2 * 250 + 250;

  level.xp += xpGain;
  level.totalXP += xpGain;

  if (level.xp >= nextXP) {
    level.level += 1;
    level.xp -= nextXP;

const zukoQuotes = JSON.parse(readFileSync('./quotes.json', 'utf-8'));
const roles = JSON.parse(readFileSync('./rolelevels.json', 'utf8'));
let leveledUp = false;

while (level.xp >= (level.level * 2 * 250 + 250)) {
  const nextXP = level.level * 2 * 250 + 250;
  level.xp -= nextXP;
  level.level += 1;
  leveledUp = true;

  // Send level up message
  const msg = zukoQuotes[Math.floor(Math.random() * zukoQuotes.length)];
  await message.reply(msg.replace(/\{level\}/g, level.level).replace(/\{user\}/g, message.author));

  // Role assignment
  const matched = roles.find(r => r.level === level.level);
  if (matched) {
    const role = message.guild.roles.cache.get(matched.roleId);
    if (role && !message.member.roles.cache.has(role.id)) {
      const lower = roles.filter(r => r.level < level.level).map(r => r.roleId);
      for (const r of lower) {
        const oldRole = message.guild.roles.cache.get(r);
        if (oldRole && message.member.roles.cache.has(oldRole.id)) {
          await message.member.roles.remove(oldRole).catch(() => {});
        }
      }
      await message.member.roles.add(role).catch(() => {});
      await message.author.send(`Uncle Iroh says: congrats! You're now **${role.name}** at level **${level.level}**!`).catch(() => {});
    }
  }
}
}


  client.setLevel.run(level);
  updateUserJSON(message.guild.id);
});

client.login(process.env.DISCORD_TOKEN);
