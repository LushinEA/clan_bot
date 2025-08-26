const { PermissionFlagsBits } = require('discord.js');
const { getClansCollection } = require('../../utils/database');
const { createInsigniaEmbed } = require('../../components/embeds/insigniaEmbeds');
const { updateState } = require('../../utils/stateManager');
const { EMOJIS } = require('../../config');

module.exports = {
    name: 'insignia-setup',
    description: 'Создает или обновляет панель для получения клановых нашивок.',
    async execute(message) {
        if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
            return message.reply({ content: 'У вас нет прав для использования этой команды.' });
        }

        try {
            console.log(`${EMOJIS.MAGIC} Админ ${message.author.tag} вызвал команду !insignia-setup`);
            
            const clansCollection = getClansCollection();
            const clans = await clansCollection.find({ status: 'approved' }).sort({ tag: 1 }).toArray();

            const messageData = createInsigniaEmbed(clans);
            const panelMessage = await message.channel.send(messageData);
            
            // Сохраняем ID сообщения и канала в JSON файл
            const insigniaPanelConfig = {
                messageId: panelMessage.id,
                channelId: panelMessage.channel.id
            };
            await updateState('insigniaPanel', insigniaPanelConfig);

            console.log(`✅ Панель нашивок создана/обновлена. ID сохранены в bot_state.json.`);
            await message.delete();

        } catch (error) {
            console.error('Ошибка при выполнении команды !insignia-setup:', error);
            await message.channel.send('❌ Произошла ошибка при создании панели. Проверьте логи.');
        }
    },
};