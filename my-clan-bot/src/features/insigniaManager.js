const { MessageFlags } = require('discord.js');
const { getClansCollection } = require('../utils/database');
const { handleInteractionError } = require('../utils/errorHandler');
const modals = require('../components/modals/insigniaModals');
const embeds = require('../components/embeds/clanCreationEmbeds');
const insigniaEmbeds = require('../components/embeds/insigniaEmbeds');
const config = require('../config');
const { getState } = require('../utils/stateManager');
const { findUserClan } = require('../utils/validationHelper');
const logger = require('../utils/logger');
const { addClanTag, removeClanTag } = require('../utils/nicknameManager');

async function handleSelect(interaction) {
    const clanRoleId = interaction.values[0];

    // Обработка пункта-заглушки
    if (clanRoleId === 'insignia_reset_selection') {
        await interaction.reply({ content: 'Выбор сброшен.', flags: [MessageFlags.Ephemeral] });
        return;
    }

    const clansCollection = getClansCollection();

    // Проверка, есть ли у пользователя уже роль какого-либо клана
    const allClans = await clansCollection.find({ guildId: interaction.guildId }).toArray();
    const userClanRoles = allClans.filter(clan => interaction.member.roles.cache.has(clan.roleId));

    if (userClanRoles.length > 0) {
        const existingClan = userClanRoles[0];
        logger.warn(`[Insignia] Пользователь ${interaction.user.tag} попытался вступить в клан (RoleID: ${clanRoleId}), состоя уже в клане "${existingClan.tag}".`);
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
    const user = interaction.user;

    try {
        const clanRoleId = interaction.customId.split('_').pop();
        const nick = interaction.fields.getTextInputValue('insignia_nick');
        const steamId = interaction.fields.getTextInputValue('insignia_steamid');
        const discordId = interaction.user.id;

        // --- ВАЛИДАЦИЯ ---
        const steamIdRegex = /^\d{17}$/;
        if (!steamIdRegex.test(steamId)) {
            await interaction.editReply({ content: '❌ **Ошибка!** Неверный формат SteamID64. Он должен состоять ровно из 17 цифр. Пожалуйста, попробуйте снова.' });
            return;
        }

        // --- ПРОВЕРКА: Состоит ли пользователь (по Discord ID или SteamID) уже в клане ---
        const existingClan = await findUserClan({ discordId, steamId });
        if (existingClan) {
            await interaction.editReply({ content: `❌ **Ошибка!** Вы (или пользователь с указанным SteamID: \`${steamId}\`) уже состоите в клане **\`${existingClan.tag}\` ${existingClan.name}**.` });
            return;
        }
        // --- КОНЕЦ ПРОВЕРКИ ---

        const clansCollection = getClansCollection();
        const clan = await clansCollection.findOne({ roleId: clanRoleId, guildId: interaction.guildId });

        if (!clan) {
            logger.warn(`[Insignia] Пользователь ${user.tag} попытался вступить в несуществующий клан с RoleID: ${clanRoleId}.`);
            await interaction.editReply({ content: '❌ Не удалось найти клан. Возможно, он был удален. Обратитесь к администрации.' });
            return;
        }
        
        logger.info(`[Insignia] Пользователь ${user.tag} (${discordId}) вступает в клан "${clan.tag}" с ником "${nick}" и SteamID "${steamId}".`);
        // Добавление участника в состав
        const newRosterEntry = `${nick}, ${steamId}, ${discordId}`;
        const updatedRoster = clan.roster ? `${clan.roster}\n${newRosterEntry}` : newRosterEntry;
        
        await clansCollection.updateOne({ _id: clan._id }, { $set: { roster: updatedRoster } });

        // Выдача роли
        const role = await interaction.guild.roles.fetch(clanRoleId);
        if (role) {
            await interaction.member.roles.add(role);
            await addClanTag(interaction.member, clan.tag);
        } else {
             throw new Error(`Роль с ID ${clanRoleId} не найдена на сервере!`);
        }
        
        // Обновление сообщений
        const updatedClanData = await clansCollection.findOne({ _id: clan._id });
        await updateClanMessages(interaction.client, updatedClanData);

        await interaction.editReply({ content: `✅ Поздравляем! Вы были приняты в клан **\`${clan.tag}\` ${clan.name}** и получили роль <@&${clan.roleId}>.` });

    } catch (error) {
        await handleInteractionError(error, interaction, 'insigniaManager.handleModal');
    }
}

async function handleLeave(interaction) {
    await interaction.deferReply({ ephemeral: true });

    try {
        const clansCollection = getClansCollection();
        const allClans = await clansCollection.find({ guildId: interaction.guildId }).toArray();
        const userClan = allClans.find(clan => interaction.member.roles.cache.has(clan.roleId));

        if (!userClan) {
            await interaction.editReply({ content: '🛡️ Вы не состоите ни в одном клане.' });
            return;
        }

        if (userClan.creatorId === interaction.user.id) {
            await handleLeaderLeave(interaction, userClan, clansCollection);
        } else {
            await handleMemberLeave(interaction, userClan, clansCollection);
        }

    } catch (error) {
        await handleInteractionError(error, interaction, 'insigniaManager.handleLeave');
    }
}

async function handleMemberLeave(interaction, clan, collection) {
    const user = interaction.user;
    logger.info(`[Insignia] Участник ${user.tag} покидает клан "${clan.tag}".`);

    const updatedRoster = clan.roster.split('\n').filter(line => !line.includes(interaction.user.id)).join('\n');
    
    await collection.updateOne({ _id: clan._id }, { $set: { roster: updatedRoster } });
    await interaction.member.roles.remove(clan.roleId).catch(e => logger.error(`Не удалось снять роль ${clan.roleId} с ${interaction.user.tag}`, e));
    await removeClanTag(interaction.member);

    const updatedClanData = await collection.findOne({ _id: clan._id });
    await updateClanMessages(interaction.client, updatedClanData);

    await interaction.editReply({ content: `✅ Вы успешно покинули клан **\`${clan.tag}\` ${clan.name}**.` });
}

async function handleLeaderLeave(interaction, clan, collection) {
    const user = interaction.user;
    logger.warn(`[Insignia] ЛИДЕР ${user.tag} покидает клан "${clan.tag}". Инициирована передача прав или расформирование.`);
    const rosterLines = clan.roster ? clan.roster.split('\n').filter(l => l.trim()) : [];
    let newLeaderMember = null;
    let newLeaderData = {};
    let newLeaderIndex = -1;

    // Ищем преемника, который есть на сервере
    for (let i = 0; i < rosterLines.length; i++) {
        const line = rosterLines[i];
        const parts = line.split(',').map(p => p.trim());
        if (parts.length < 3) continue;
        const discordId = parts[2];
        const potentialMember = await interaction.guild.members.fetch(discordId).catch(() => null);
        if (potentialMember) {
            newLeaderMember = potentialMember;
            newLeaderData = { nick: parts[0], steamId: parts[1], discordId: parts[2] };
            newLeaderIndex = i;
            break;
        }
    }

    // --- Сценарий 1: Преемник не найден (ростер пуст или все из ростера вышли с сервера). Клан расформировывается. ---
    if (!newLeaderMember) {
        logger.warn(`[Insignia] Преемник для клана "${clan.tag}" не найден. Клан расформирован после ухода лидера ${user.tag}.`);
        await removeClanTag(interaction.member);
        await interaction.guild.roles.delete(clan.roleId).catch(e => logger.error(`Не удалось удалить роль клана ${clan.tag}`, e));
        if (clan.registryMessageId) {
            const registryChannel = await interaction.client.channels.fetch(config.CHANNELS.CLAN_REGISTRY).catch(() => null);
            if (registryChannel) await registryChannel.messages.delete(clan.registryMessageId).catch(() => {});
        }
        if (clan.logMessageId) {
            const logChannel = await interaction.client.channels.fetch(config.REVIEW_CHANNEL_ID).catch(() => null);
            if (logChannel) await logChannel.messages.delete(clan.logMessageId).catch(() => {});
        }
        await collection.deleteOne({ _id: clan._id });
        await interaction.member.roles.remove(config.ROLES.CLAN_LEADER_ID).catch(() => {});
        
        await updateInsigniaPanel(interaction.client);

        await interaction.editReply({ content: `✅ Вы были последним активным участником. Клан **\`${clan.tag}\` ${clan.name}** был успешно расформирован.` });
        return;
    }

    // --- Сценарий 2: Преемник найден. Передаем лидерство. ---
    logger.warn(`[Insignia] Лидерство в клане "${clan.tag}" передано от ${user.tag} к ${newLeaderMember.user.tag} (${newLeaderMember.id}).`);
    rosterLines.splice(newLeaderIndex, 1);
    const updatedClanDBData = {
        roster: rosterLines.join('\n'),
        creatorId: newLeaderMember.id,
        creatorTag: newLeaderMember.user.tag,
        leader_discordid: newLeaderMember.id,
        leader_nick: newLeaderData.nick,
        leader_steamid: newLeaderData.steamId,
    };
    await collection.updateOne({ _id: clan._id }, { $set: updatedClanDBData });

    await removeClanTag(interaction.member);
    // Переназначаем роли
    await interaction.member.roles.remove(clan.roleId).catch(() => {});
    await interaction.member.roles.remove(config.ROLES.CLAN_LEADER_ID).catch(() => {});
    await newLeaderMember.roles.add(config.ROLES.CLAN_LEADER_ID).catch(() => {});
    const finalClanData = await collection.findOne({ _id: clan._id });
    await updateClanMessages(interaction.client, finalClanData);
    await interaction.editReply({ content: `✅ Вы покинули клан. Лидерство было успешно передано <@${newLeaderMember.id}>.` });
}

/**
 * Обновляет сообщения в реестре и логах
 * @param {import('discord.js').Client} client 
 * @param {object} clanData 
 */
async function updateClanMessages(client, clanData) {
    if (!clanData) return;
    // 1. Обновление сообщения в реестре кланов
    if (clanData.registryMessageId && config.CHANNELS.CLAN_REGISTRY) {
        try {
            const channel = await client.channels.fetch(config.CHANNELS.CLAN_REGISTRY);
            const message = await channel.messages.fetch(clanData.registryMessageId);
            const newEmbed = embeds.createRegistryEmbed(clanData);
            await message.edit({ embeds: [newEmbed] });
        } catch (error) {
            logger.error(`[Insignia] Не удалось обновить сообщение в реестре для клана ${clanData.tag}:`, error);
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
            logger.error(`[Insignia] Не удалось обновить лог-сообщение для клана ${clanData.tag}:`, error);
        }
    }
}

/**
 * Находим и обновляем сообщение с панелью для получения нашивок
 * @param {import('discord.js').Client} client 
 */
async function updateInsigniaPanel(client) {
    logger.info('Запущено обновление панели нашивок...');
    try {
        const state = await getState();
        const panelConfig = state.insigniaPanel;

        if (!panelConfig || !panelConfig.channelId || !panelConfig.messageId) {
            logger.warn('[ПРЕДУПРЕЖДЕНИЕ] Конфигурация панели нашивок не найдена в bot_state.json. Обновление пропущено. Используйте !insignia-setup.');
            return;
        }

        const channel = await client.channels.fetch(panelConfig.channelId).catch(() => null);
        if (!channel) {
             logger.error(`[ОШИБКА] Не удалось найти канал для панели нашивок с ID: ${panelConfig.channelId}`);
             return;
        }

        const message = await channel.messages.fetch(panelConfig.messageId).catch(() => null);
        if (!message) {
            logger.error(`[ОШИБКА] Не удалось найти сообщение для панели нашивок с ID: ${panelConfig.messageId}. Возможно, оно было удалено. Используйте !insignia-setup для создания нового.`);
            return;
        }

        const clansCollection = getClansCollection();
        const clans = await clansCollection.find({ status: 'approved' }).sort({ tag: 1 }).toArray();

        const newPanelData = insigniaEmbeds.createInsigniaEmbed(clans);
        await message.edit(newPanelData);
        
        logger.info('Панель нашивок успешно обновлена.');
    } catch (error) {
        logger.error('Произошла критическая ошибка при обновлении панели нашивок:', error);
    }
}

module.exports = {
    handleSelect,
    handleModal,
    handleLeave,
    updateInsigniaPanel,
    updateClanMessages,
};