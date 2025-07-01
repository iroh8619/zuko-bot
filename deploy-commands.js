if (typeof ReadableStream === 'undefined') {
  global.ReadableStream = require('web-streams-polyfill/dist/ponyfill.js').ReadableStream;
}

const { REST, Routes } = require('discord.js');
const { readdirSync } = require('fs');
const { join } = require('path');
const { clientId, token } = require('./config.json');

const commands = [];
const commandsPath = join(__dirname, 'commands');
const commandFiles = readdirSync(commandsPath).filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
  const command = require(join(commandsPath, file));
  if ('data' in command && 'execute' in command) {
    commands.push(command.data.toJSON());
  } else {
    console.warn(`[WARNING] The command at ${file} is missing "data" or "execute".`);
  }
}

const rest = new REST({ version: '10' }).setToken(token);

(async () => {
  try {
    console.log('🔄 Refreshing application (/) commands...');

    await rest.put(
      Routes.applicationCommands(clientId),
      { body: commands }
    );

    console.log('✅ Successfully registered application commands.');
  } catch (error) {
    console.error('❌ Error while registering commands:', error);
  }
})();
