const { MessageFlags } = require('discord.js');
const { getClansCollection } = require('../utils/database');
const { handleInteractionError } = require('../utils/errorHandler');
const modals = require('../components/modals/insigniaModals');
const embeds = require('../components/embeds/clanCreationEmbeds');
const config = require('../config');

async function handleSelect(interaction) {
    const clanRoleId = interaction.values[0];
    const clansCollection = getClansCollection();

    // Проверка, есть ли у пользователя уже роль какого-либо клана
    const allClans = await clansCollection.find({ guildId: interaction.guildId }).toArray();
    const userClanRoles = allClans.filter(clan => interaction.member.roles.cache.has(clan.roleId));

    if (userClanRoles.length > 0) {
        const existingClan = userClanRoles[0];
        await interaction.reply({
            content: `🛡️ Вы уже состоите в клане **\`${existingClan.tag}\` ${existingClan.name}**. Нельзя присоединиться к другому клану, не покинув текущий.`,
            flags: [MessageFlags.Ephemeral]
        });
        return;
    }
    
    await interaction.showModal(modals.createInsigniaModal(clanRoleId));
}

async function handleModal(interaction) {
    await interaction.deferReply({ ephemeral: true });

    try {
        const clanRoleId = interaction.customId.split('_').pop();
        const nick = interaction.fields.getTextInputValue('insignia_nick');
        const steamId = interaction.fields.getTextInputValue('insignia_steamid');
        const discordId = interaction.user.id;

        // --- ВАЛИДАЦИЯ ---
        const steamIdRegex = /^\d{17}$/;
        if (!steamIdRegex.test(steamId)) {
            await interaction.editReply({
                content: '❌ **Ошибка!** Неверный формат SteamID64. Он должен состоять ровно из 17 цифр. Пожалуйста, попробуйте снова.',
            });
            return;
        }

        const clansCollection = getClansCollection();
        const clan = await clansCollection.findOne({ roleId: clanRoleId, guildId: interaction.guildId });

        if (!clan) {
            await interaction.editReply({ content: '❌ Не удалось найти клан. Возможно, он был удален. Обратитесь к администрации.' });
            return;
        }
        
        // Добавление участника в состав
        const newRosterEntry = `${nick}, ${steamId}, ${discordId}`;
        const updatedRoster = clan.roster ? `${clan.roster}\n${newRosterEntry}` : newRosterEntry;
        
        await clansCollection.updateOne(
            { _id: clan._id },
            { $set: { roster: updatedRoster } }
        );

        // Выдача роли
        const role = await interaction.guild.roles.fetch(clanRoleId);
        if (role) {
            await interaction.member.roles.add(role);
        } else {
             throw new Error(`Роль с ID ${clanRoleId} не найдена на сервере!`);
        }
        
        // Обновление сообщений
        const updatedClanData = await clansCollection.findOne({ _id: clan._id });
        await updateClanMessages(interaction.client, updatedClanData);

        await interaction.editReply({
            content: `✅ Поздравляем! Вы были приняты в клан **\`${clan.tag}\` ${clan.name}** и получили роль <@&${clan.roleId}>.`
        });

    } catch (error) {
        await handleInteractionError(error, interaction, 'insigniaManager.handleModal');
    }
}

/**
 * Обновляет сообщения в реестре и логах
 * @param {import('discord.js').Client} client 
 * @param {object} clanData 
 */
async function updateClanMessages(client, clanData) {
    // 1. Обновление сообщения в реестре кланов
    if (clanData.registryMessageId && config.CHANNELS.CLAN_REGISTRY) {
        try {
            const channel = await client.channels.fetch(config.CHANNELS.CLAN_REGISTRY);
            const message = await channel.messages.fetch(clanData.registryMessageId);
            const newEmbed = embeds.createRegistryEmbed(clanData);
            await message.edit({ embeds: [newEmbed] });
        } catch (error) {
            console.error(`[Insignia] Не удалось обновить сообщение в реестре для клана ${clanData.tag}:`, error);
        }
    }

    // 2. Обновление сообщения в логах администрации
    if (clanData.logMessageId && config.REVIEW_CHANNEL_ID) {
         try {
            const channel = await client.channels.fetch(config.REVIEW_CHANNEL_ID);
            const message = await channel.messages.fetch(clanData.logMessageId);
            
            const author = { tag: clanData.creatorTag, iconURL: null }; 
            const role = { id: clanData.roleId };
            
            const newLogEmbed = embeds.createLogEmbed(author, clanData, role);
            await message.edit({ embeds: newLogEmbed.embeds });
        } catch (error) {
            console.error(`[Insignia] Не удалось обновить лог-сообщение для клана ${clanData.tag}:`, error);
        }
    }
}

module.exports = {
    handleSelect,
    handleModal,
};