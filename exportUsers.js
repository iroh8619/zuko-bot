// export-users.js
const fs = require('fs');
const SQLite = require('better-sqlite3');
const sql = new SQLite('/data/mainDB.sqlite');

const guildId = '905876133151637575'; // Replace with your actual guild ID
const topUsers = sql.prepare("SELECT * FROM levels WHERE guild = ? ORDER BY totalXP DESC;").all(guildId);

const data = topUsers.map((entry, index) => ({
  rank: index + 1,
  userId: entry.user,
  level: entry.level,
  xp: entry.xp,
  totalXP: entry.totalXP
}));

fs.writeFileSync('./users.json', JSON.stringify(data, null, 2));
console.log('Export completed: users.json');
