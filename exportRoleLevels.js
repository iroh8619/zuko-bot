const fs = require('fs');
const SQLite = require('better-sqlite3');
const sql = new SQLite('./mainDB.sqlite');

// Replace this with your actual guild ID
const guildId = '905876133151637575';

const roles = sql.prepare("SELECT * FROM roles WHERE guildID = ?").all(guildId);

if (!roles.length) {
  console.log('⚠️ No level roles found for this guild.');
  process.exit(0);
}

const output = roles.map(row => ({
  level: row.level,
  roleId: row.roleID
}));

fs.writeFileSync('./rolelevels.json', JSON.stringify(output, null, 2));
console.log('✅ rolelevels.json created successfully.');
