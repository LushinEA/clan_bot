const { Events } = require('discord.js');
const logger = require('../../utils/logger');
const { EMOJIS } = require('../../config');

module.exports = {
    name: Events.ClientReady,
    once: true,
    execute(client) {
        logger.info(`Бот ${client.user.tag} запущен и готов к работе!`);
        client.user.setActivity('заявки на создание кланов', { type: 'WATCHING' });
    },
};