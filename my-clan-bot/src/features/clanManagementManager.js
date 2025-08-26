const { MessageFlags, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');
const { getClansCollection } = require('../utils/database');
const { handleInteractionError } = require('../utils/errorHandler');
const modals = require('../components/modals/clanManagementModals');
const config = require('../config');
const { updateInsigniaPanel, updateClanMessages } = require('./insigniaManager');
const { validateUniqueness, validateRosterMembers } = require('../utils/validationHelper');


async function handleButton(interaction) {
    // 1. Проверка, является ли пользователь лидером клана
    if (!interaction.member.roles.cache.has(config.ROLES.CLAN_LEADER_ID)) {
        await interaction.reply({ content: 'У вас нет прав для управления кланом.', flags: [MessageFlags.Ephemeral] });
        return;
    }

    // 2. Находим клан, которым управляет этот пользователь
    const clansCollection = getClansCollection();
    const clan = await clansCollection.findOne({ creatorId: interaction.user.id, guildId: interaction.guildId });

    if (!clan) {
        await interaction.reply({ content: 'Не удалось найти ваш клан. Обратитесь к администрации.', flags: [MessageFlags.Ephemeral] });
        return;
    }

    try {
        switch (interaction.customId) {
            case 'clan_manage_edit_info':
                await interaction.showModal(modals.createEditInfoModal(clan));
                break;
            case 'clan_manage_edit_roster':
                await interaction.showModal(modals.createEditRosterModal(clan));
                break;
            case 'clan_manage_delete':
                await confirmDeletion(interaction, clan);
                break;
            case `clan_manage_delete_confirm_${clan._id}`:
                await deleteClan(interaction, clan, clansCollection);
                break;
            case `clan_manage_delete_cancel_${clan._id}`:
                await interaction.update({ content: '✅ Расформирование клана отменено.', embeds: [], components: [] });
                break;
        }
    } catch (error) {
        await handleInteractionError(error, interaction, `clanManagementManager.handleButton`);
    }
}

async function handleModalSubmit(interaction) {
    if (!interaction.member.roles.cache.has(config.ROLES.CLAN_LEADER_ID)) { return; }
    
    await interaction.deferReply({ ephemeral: true });

    const clansCollection = getClansCollection();
    const clan = await clansCollection.findOne({ creatorId: interaction.user.id, guildId: interaction.guildId });
    if (!clan) {
        await interaction.editReply({ content: 'Не удалось найти ваш клан.' });
        return;
    }

    try {
        switch (interaction.customId) {
            case 'clan_manage_edit_info_modal':
                await processInfoEdit(interaction, clan, clansCollection);
                break;
            case 'clan_manage_edit_roster_modal':
                await processRosterEdit(interaction, clan, clansCollection);
                break;
        }
    } catch (error) {
        await handleInteractionError(error, interaction, `clanManagementManager.handleModalSubmit`);
    }
}

async function processInfoEdit(interaction, clan, collection) {
    const newTag = interaction.fields.getTextInputValue('clan_tag');
    const newName = interaction.fields.getTextInputValue('clan_name');
    const newColor = '#' + interaction.fields.getTextInputValue('clan_color').toUpperCase();
    const newServer = interaction.fields.getTextInputValue('clan_server');

    // Валидация формата
    if (!/^[0-9A-F]{6}$/i.test(newColor.replace('#', ''))) {
        return interaction.editReply({ content: '❌ Неверный формат HEX-кода цвета.' });
    }
     if (!Object.keys(config.SERVERS).includes(newServer)) {
        return interaction.editReply({ content: '❌ Неверный номер сервера.' });
    }
    
    // --- ПРОВЕРКА: Уникальность, исключая текущий клан ---
    const uniquenessCheck = await validateUniqueness({ tag: newTag, name: newName, color: newColor }, clan._id);
    if (!uniquenessCheck.isValid) {
        await interaction.editReply({ content: uniquenessCheck.message });
        return;
    }
    // --- КОНЕЦ ПРОВЕРКИ ---
    
    // Обновляем роль в Discord
    await interaction.guild.roles.edit(clan.roleId, {
        name: newTag,
        color: newColor,
        reason: `Обновление клана лидером ${interaction.user.tag}`
    }).catch(e => console.error("Ошибка обновления роли:", e));

    // Обновляем данные в БД
    const updateData = { tag: newTag, name: newName, color: newColor, server: newServer };
    await collection.updateOne({ _id: clan._id }, { $set: updateData });

    const updatedClan = { ...clan, ...updateData };
    
    // Обновляем все связанные сообщения
    await updateClanMessages(interaction.client, updatedClan);
    await updateInsigniaPanel(interaction.client);
    
    await interaction.editReply({ content: '✅ Информация о клане успешно обновлена!' });
}

async function processRosterEdit(interaction, clan, collection) {
    const newRosterText = interaction.fields.getTextInputValue('clan_roster');

    // --- ПРОВЕРКА: Участники не должны состоять в других кланах ---
    const rosterCheck = await validateRosterMembers(newRosterText, clan._id);
    if (!rosterCheck.isValid) {
        await interaction.editReply({ content: rosterCheck.message });
        return;
    }
    // --- КОНЕЦ ПРОВЕРКИ ---

    const oldRosterLines = clan.roster ? clan.roster.split('\n').filter(l => l.trim()) : [];
    const newRosterLines = newRosterText ? newRosterText.split('\n').filter(l => l.trim()) : [];

    const getDiscordId = line => line.split(',').map(p => p.trim())[2];

    const oldIds = new Set(oldRosterLines.map(getDiscordId).filter(Boolean));
    const newIds = new Set(newRosterLines.map(getDiscordId).filter(Boolean));
    
    const addedIds = [...newIds].filter(id => !oldIds.has(id));
    const removedIds = [...oldIds].filter(id => !newIds.has(id));

    // Выдаем роли новым участникам
    for (const id of addedIds) {
        const member = await interaction.guild.members.fetch(id).catch(() => null);
        if (member) await member.roles.add(clan.roleId);
    }

    // Забираем роли у удаленных
    for (const id of removedIds) {
        const member = await interaction.guild.members.fetch(id).catch(() => null);
        if (member) await member.roles.remove(clan.roleId);
    }
    
    // Обновляем состав в БД
    await collection.updateOne({ _id: clan._id }, { $set: { roster: newRosterText } });

    const updatedClan = await collection.findOne({ _id: clan._id });
    await updateClanMessages(interaction.client, updatedClan);

    await interaction.editReply({ content: `✅ Состав клана обновлен. Добавлено: ${addedIds.length}, Удалено: ${removedIds.length}.` });
}

async function confirmDeletion(interaction, clan) {
    const embed = new EmbedBuilder()
        .setTitle(`Вы уверены, что хотите расформировать клан?`)
        .setDescription(
            `**Клан:** \`${clan.tag}\` ${clan.name}\n\n` +
            `Это действие **НЕОБРАТИМО** и приведет к следующему:\n` +
            `• Роль <@&${clan.roleId}> будет удалена.\n` +
            `• Все записи о клане будут стерты из базы данных.\n` +
            `• Сообщения в реестре и логах будут удалены.`
        )
        .setColor(config.COLORS.DANGER);
    
    const buttons = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(`clan_manage_delete_confirm_${clan._id}`)
            .setLabel('Да, расформировать')
            .setStyle(ButtonStyle.Danger),
        new ButtonBuilder()
            .setCustomId(`clan_manage_delete_cancel_${clan._id}`)
            .setLabel('Отмена')
            .setStyle(ButtonStyle.Secondary)
    );

    await interaction.reply({ embeds: [embed], components: [buttons], flags: [MessageFlags.Ephemeral] });
}


async function deleteClan(interaction, clan, collection) {
    await interaction.update({ content: `${config.EMOJIS.LOADING} Начинаю процесс расформирования...`, embeds: [], components: [] });

    // 1. Удаление роли
    await interaction.guild.roles.delete(clan.roleId).catch(e => console.warn(`Не удалось удалить роль ${clan.tag}: ${e.message}`));
    
    // 2. Удаление сообщения из реестра
    if (clan.registryMessageId) {
        const registryChannel = await interaction.client.channels.fetch(config.CHANNELS.CLAN_REGISTRY).catch(() => null);
        if (registryChannel) await registryChannel.messages.delete(clan.registryMessageId).catch(() => {});
    }

    // 3. Удаление лога
    if (clan.logMessageId) {
        const logChannel = await interaction.client.channels.fetch(config.REVIEW_CHANNEL_ID).catch(() => null);
        if (logChannel) await logChannel.messages.delete(clan.logMessageId).catch(() => {});
    }

    // 4. Снятие роли лидера
    await interaction.member.roles.remove(config.ROLES.CLAN_LEADER_ID).catch(() => {});
    
    // 5. Удаление из БД
    await collection.deleteOne({ _id: clan._id });

    // 6. Обновление панели нашивок
    await updateInsigniaPanel(interaction.client);
    
    await interaction.editReply({ content: `✅ Клан **\`${clan.tag}\` ${clan.name}** был успешно расформирован.` });
}


module.exports = {
    handleButton,
    handleModalSubmit,
};