const { MessageFlags } = require('discord.js');

/**
 * Централизованный обработчик ошибок для взаимодействий.
 * Логирует подробную информацию для разработчика и отправляет
 * безопасное сообщение пользователю.
 * @param {Error} error Объект ошибки.
 * @param {import('discord.js').Interaction} interaction Взаимодействие, которое вызвало ошибку.
 * @param {string} [source='Неизвестный источник'] Место, где произошла ошибка (например, имя функции).
 */
async function handleInteractionError(error, interaction, source = 'Неизвестный источник') {
    // 1. Подробное логирование для разработчика в консоль
    console.error(`❌ [ОШИБКА] в "${source}"`);
    console.error(`  - Пользователь: ${interaction.user.tag} (${interaction.user.id})`);
    console.error(`  - Сервер: ${interaction.guild.name} (${interaction.guild.id})`);
    if (interaction.isCommand() || interaction.isAutocomplete()) {
        console.error(`  - Команда: ${interaction.commandName}`);
    } else if (interaction.customId) {
        console.error(`  - Custom ID: ${interaction.customId}`);
    }
    console.error(error);

    // 2. Понятный и безопасный ответ для пользователя
    const errorMessage = {
        content: '⚙️ Произошла непредвиденная ошибка. Я уже сообщил разработчикам об этой проблеме. Пожалуйста, попробуйте снова чуть позже.',
        flags: MessageFlags.Ephemeral, // Использование flags вместо ephemeral
    };

    try {
        if (interaction.replied || interaction.deferred) {
            await interaction.followUp(errorMessage);
        } else {
            await interaction.reply(errorMessage);
        }
    } catch (replyError) {
        console.error('!! КРИТИЧЕСКАЯ ОШИБКА: Не удалось даже отправить сообщение об ошибке пользователю.', replyError);
    }
}

module.exports = { handleInteractionError };