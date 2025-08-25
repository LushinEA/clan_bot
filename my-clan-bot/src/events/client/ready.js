const { Events } = require('discord.js');
const { EMOJIS } = require('../../config');

module.exports = {
    name: Events.ClientReady,
    once: true,
    execute(client) {
        console.log(`✅ ${EMOJIS.SPARKLES} Бот ${client.user.tag} запущен и готов к работе!`);
        client.user.setActivity('заявки на создание кланов', { type: 'WATCHING' });
    },
};