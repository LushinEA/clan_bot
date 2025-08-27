const { MessageFlags } = require('discord.js');
const logger = require('./logger');

/**
 * Централизованный обработчик ошибок для взаимодействий.
 * Логирует подробную информацию для разработчика и отправляет
 * безопасное сообщение пользователю.
 * @param {Error} error Объект ошибки.
 * @param {import('discord.js').Interaction} interaction Взаимодействие, которое вызвало ошибку.
 * @param {string} [source='Неизвестный источник'] Место, где произошла ошибка (например, имя функции).
 */
async function handleInteractionError(error, interaction, source = 'Неизвестный источник') {
    // 1. Подробное логирование для разработчика
    let errorDetails = `[ОШИБКА] в "${source}"\n`;
    errorDetails += `  - Пользователь: ${interaction.user.tag} (${interaction.user.id})\n`;
    errorDetails += `  - Сервер: ${interaction.guild.name} (${interaction.guild.id})\n`;
    if (interaction.isCommand() || interaction.isAutocomplete()) {
        errorDetails += `  - Команда: ${interaction.commandName}\n`;
    } else if (interaction.customId) {
        errorDetails += `  - Custom ID: ${interaction.customId}\n`;
    }
    
    logger.error(errorDetails, error);

    // 2. Понятный и безопасный ответ для пользователя
    const errorMessage = {
        content: '⚙️ Произошла непредвиденная ошибка. Я уже сообщил разработчикам об этой проблеме. Пожалуйста, попробуйте снова чуть позже.',
        flags: MessageFlags.Ephemeral,
    };

    try {
        if (interaction.replied || interaction.deferred) {
            await interaction.followUp(errorMessage);
        } else {
            await interaction.reply(errorMessage);
        }
    } catch (replyError) {
        logger.error('!! КРИТИЧЕСКАЯ ОШИБКА: Не удалось даже отправить сообщение об ошибке пользователю.', replyError);
    }
}

module.exports = { handleInteractionError };