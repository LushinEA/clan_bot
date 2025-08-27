const { Events } = require('discord.js');
const logger = require('../../utils/logger');
const { EMOJIS } = require('../../config');

module.exports = {
    name: Events.ClientReady,
    once: true,
    async execute(client) {
        logger.info(`Бот ${client.user.tag} запущен и готов к работе!`);
        client.user.setActivity('заявки на создание кланов', { type: 'WATCHING' });

        // --- Запуск очистки старых логов ---
        // 1. Запускаем очистку сразу при старте бота
        await logger.cleanupOldLogs();

        // 2. Устанавливаем интервал для запуска очистки каждые 24 часа
        const twentyFourHoursInMs = 24 * 60 * 60 * 1000;
        setInterval(() => {
            logger.cleanupOldLogs();
        }, twentyFourHoursInMs);
    },
};