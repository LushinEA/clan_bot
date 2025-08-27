const { createMainEmbed } = require('../../components/embeds/clanCreationEmbeds');
const logger = require('../../utils/logger');

/**
 * Отправляет главное сообщение для начала регистрации кланов в указанный канал.
 * Эта функция вызывается при обнаружении команды !create-clan.
 * @param {import('discord.js').Message} message - Объект сообщения, которое вызвало команду.
 */
async function execute(message) {
    if (!message.member.permissions.has('Administrator')) {
        await message.reply({ content: 'У вас нет прав для использования этой команды.' });
        return;
    }

    try {
        logger.info(`Админ ${message.author.tag} вызвал команду !create-clan в канале #${message.channel.name}`);
        const messageData = createMainEmbed();
        await message.channel.send(messageData);
        await message.delete();

    } catch (error) {
        logger.error(`Ошибка при выполнении команды !create-clan от ${message.author.tag}:`, error);
        await message.channel.send('❌ Произошла ошибка при отправке сообщения. Проверьте права бота в этом канале.');
    }
}

module.exports = {
    name: 'create-clan',
    description: 'Отправляет сообщение для начала регистрации кланов.',
    execute,
};