const { PermissionFlagsBits } = require('discord.js');
const { getClansCollection } = require('../../utils/database');
const { createInsigniaEmbed } = require('../../components/embeds/insigniaEmbeds');
const { EMOJIS } = require('../../config');

module.exports = {
    name: 'insignia-setup',
    description: 'Создает панель для получения клановых нашивок.',
    async execute(message) {
        if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
            return message.reply({ content: 'У вас нет прав для использования этой команды.' });
        }

        try {
            console.log(`${EMOJIS.MAGIC} Админ ${message.author.tag} вызвал команду !insignia-setup`);
            
            const clansCollection = getClansCollection();
            // Получаем только активные кланы, сортируем по тегу
            const clans = await clansCollection.find({ status: 'approved' }).sort({ tag: 1 }).toArray();

            if (clans.length === 0) {
                return message.reply({ content: 'На сервере еще нет зарегистрированных кланов для создания панели.' });
            }

            const messageData = createInsigniaEmbed(clans);
            await message.channel.send(messageData);
            await message.delete();

        } catch (error) {
            console.error('Ошибка при выполнении команды !insignia-setup:', error);
            await message.channel.send('❌ Произошла ошибка при создании панели. Проверьте логи.');
        }
    },
};