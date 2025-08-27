const { Client, GatewayIntentBits, Collection } = require('discord.js');
const fs = require('fs');
const path = require('path');
const { connectToDb } = require('./src/utils/database');
const logger = require('./src/utils/logger');
require('dotenv').config();

// Проверка наличия токена перед запуском
if (!process.env.BOT_TOKEN) {
    logger.error("КРИТИЧЕСКАЯ ОШИБКА: BOT_TOKEN не найден в файле .env! Бот не может быть запущен.");
    process.exit(1);
}

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers
    ]
});

// --- Префикс для команд ---
const prefix = '!';

// --- Хранилище для команд ---
client.commands = new Collection();

// --- Загрузка файлов команд ---
logger.info('Загрузка текстовых команд...');
const commandsPath = path.join(__dirname, 'src/commands');
const commandFolders = fs.readdirSync(commandsPath);

for (const folder of commandFolders) {
    const folderPath = path.join(commandsPath, folder);
    const commandFiles = fs.readdirSync(folderPath).filter(file => file.endsWith('.js'));
    for (const file of commandFiles) {
        const filePath = path.join(folderPath, file);
        const command = require(filePath);
        if ('name' in command && 'execute' in command) {
            client.commands.set(command.name, command);
            logger.info(`Команда "${command.name}" успешно загружена.`);
        } else {
            logger.warn(`В команде ${filePath} отсутствует "name" или "execute".`);
        }
    }
}

// --- Загрузка обработчиков событий ---
logger.info('Загрузка обработчиков событий...');
const eventsPath = path.join(__dirname, 'src/events');
const eventFolders = fs.readdirSync(eventsPath);

for (const folder of eventFolders) {
    const folderPath = path.join(eventsPath, folder);
    const eventFiles = fs.readdirSync(folderPath).filter(file => file.endsWith('.js'));
    for (const file of eventFiles) {
        const filePath = path.join(folderPath, file);
        const event = require(filePath);
        if (event.once) {
            client.once(event.name, (...args) => event.execute(...args, client));
        } else {
            client.on(event.name, (...args) => event.execute(...args, client));
        }
        logger.info(`Событие "${event.name}" успешно загружено.`);
    }
}


// --- Главный обработчик текстовых команд ---
client.on('messageCreate', async (message) => {
    // Игнорируем сообщения от ботов и без префикса
    if (message.author.bot || !message.content.startsWith(prefix) || !message.guild) return;

    const args = message.content.slice(prefix.length).trim().split(/ +/);
    const commandName = args.shift().toLowerCase();
    
    const command = client.commands.get(commandName);

    if (!command) return;

    try {
        logger.info(`[TextCmd] Пользователь ${message.author.tag} (${message.author.id}) вызвал команду: !${commandName} с аргументами: [${args.join(', ')}]`);
        await command.execute(message, args);
    } catch (error) {
        logger.error(`Ошибка при выполнении текстовой команды "${commandName}" пользователем ${message.author.tag}:`, error);
        await message.reply({ content: 'При выполнении этой команды произошла ошибка!' });
    }
});


// --- Запуск бота ---
(async () => {
    try {
        await connectToDb();
        await client.login(process.env.BOT_TOKEN);
    } catch (error) {
        logger.error("Не удалось запустить бота:", error);
    }
})();