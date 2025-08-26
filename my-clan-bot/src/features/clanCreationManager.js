const { Collection, MessageFlags } = require('discord.js');
const embeds = require('../components/embeds/clanCreationEmbeds');
const modals = require('../components/modals/clanCreationModals');
const { getClansCollection } = require('../utils/database');
const { handleInteractionError } = require('../utils/errorHandler');
const config = require('../config');

const registrationSessions = new Map();

async function start(interaction) {
    const userId = interaction.user.id;
    if (registrationSessions.has(userId)) {
        await interaction.reply({ content: 'Вы уже находитесь в процессе создания клана.', flags: [MessageFlags.Ephemeral] });
        return;
    }
    registrationSessions.set(userId, { step: 1, data: {}, isEditing: false });
    const reply = embeds.createStep1Embed(interaction);
    await interaction.reply({ ...reply, flags: [MessageFlags.Ephemeral] });
}

async function handleButton(interaction) {
    const userId = interaction.user.id;
    const session = registrationSessions.get(userId);
    
    if (!session && !['clan_create_start'].includes(interaction.customId)) {
        await interaction.reply({ content: '⏳ Ваша сессия создания клана истекла или была отменена.', flags: [MessageFlags.Ephemeral] });
        return;
    }
    try {
        switch (interaction.customId) {
            case 'clan_create_start':
                await start(interaction);
                break;
            case 'clan_create_step1_button':
                await interaction.showModal(modals.createBasicInfoModal(session.data));
                break;
            case 'clan_create_step2_button':
                await interaction.showModal(modals.createLeaderInfoModal(session.data));
                break;
            case 'clan_create_step3_button':
                await interaction.showModal(modals.createRosterModal(session.data));
                break;
            case 'clan_create_confirm':
                await submitAndCreateClan(interaction, session);
                registrationSessions.delete(userId);
                break;
            case 'clan_create_edit':
                session.isEditing = true;
                await interaction.showModal(modals.createBasicInfoModal(session.data));
                break;
            case 'clan_create_cancel':
                registrationSessions.delete(userId);
                await interaction.update({ content: '✅ Регистрация клана отменена.', embeds: [], components: [] });
                break;
        }
    } catch (error) {
        await handleInteractionError(error, interaction, `handleButton: ${interaction.customId}`);
    }
}

async function handleModalSubmit(interaction) {
    const userId = interaction.user.id;
    const session = registrationSessions.get(userId);
    if (!session) { return; }

    try {
        await interaction.deferUpdate();
        
        switch (interaction.customId) {
            case 'clan_create_step1_modal':
                session.data.tag = interaction.fields.getTextInputValue('clan_tag');
                session.data.name = interaction.fields.getTextInputValue('clan_name');
                session.data.color = '#' + interaction.fields.getTextInputValue('clan_color');
                session.data.server = interaction.fields.getTextInputValue('clan_server');
                
                if (session.isEditing) {
                    await interaction.editReply(embeds.createStep2Embed(interaction, session.data));
                } else {
                    session.step = 2;
                    await interaction.editReply(embeds.createStep2Embed(interaction, session.data));
                }
                break;
            case 'clan_create_step2_modal':
                session.data.leader_nick = interaction.fields.getTextInputValue('leader_nick');
                session.data.leader_steamid = interaction.fields.getTextInputValue('leader_steamid');
                session.data.leader_discordid = interaction.user.id;

                if (session.isEditing) {
                    await interaction.editReply(embeds.createStep3Embed(interaction, session.data));
                } else {
                    session.step = 3;
                    await interaction.editReply(embeds.createStep3Embed(interaction, session.data));
                }
                break;
            case 'clan_create_step3_modal':
                session.data.roster = interaction.fields.getTextInputValue('clan_roster');

                if (session.isEditing) {
                    session.isEditing = false;
                    await interaction.editReply(embeds.createFinalConfirmationEmbed(interaction, session));
                } else {
                    session.step = 4;
                    await askForEmblem(interaction, session);
                }
                break;
        }
    } catch (error) {
        await handleInteractionError(error, interaction, `handleModalSubmit: ${interaction.customId}`);
    }
}

async function askForEmblem(interaction, session) {
    await interaction.editReply(embeds.createEmblemRequestEmbed(interaction, session.data));
    
    const filter = (i) => ['clan_emblem_skip', 'clan_create_cancel'].includes(i.customId) && i.user.id === interaction.user.id;
    const collector = interaction.channel.createMessageComponentCollector({ filter, time: 60000, max: 1 });
    
    const messageFilter = (m) => m.author.id === interaction.user.id && m.attachments.size > 0;
    const messageCollector = interaction.channel.createMessageCollector({ filter: messageFilter, time: 60000, max: 1 });

    collector.on('collect', async i => {
        if (i.customId === 'clan_create_cancel') {
             messageCollector.stop('cancel');
             registrationSessions.delete(interaction.user.id);
             await i.update({ content: '✅ Регистрация клана отменена.', embeds: [], components: [] });
             return;
        }
        session.data.emblem = null;
        messageCollector.stop();
        await i.update({ ...embeds.createFinalConfirmationEmbed(i, session) });
    });

    messageCollector.on('collect', async m => {
        const attachment = m.attachments.first();
        if (attachment && attachment.contentType?.startsWith('image')) {
            session.data.emblem = attachment.url;
            collector.stop();
            await interaction.editReply({ ...embeds.createFinalConfirmationEmbed(interaction, session) });
            await m.delete().catch(() => {});
        }
    });

    collector.on('end', async (collected, reason) => {
        if (reason === 'cancel') return;
        if (reason === 'time' && messageCollector.collected.size === 0) {
            session.data.emblem = null;
            await interaction.editReply({ ...embeds.createFinalConfirmationEmbed(interaction, session) });
        }
    });
}

async function submitAndCreateClan(interaction, session) {
    await interaction.deferUpdate({ flags: [MessageFlags.Ephemeral] });
    let newRole;
    try {
        newRole = await interaction.guild.roles.create({
            name: session.data.tag,
            color: session.data.color,
            mentionable: false,
            reason: `Регистрация клана ${session.data.name}`
        });
    } catch (error) {
        console.error('❌ Ошибка при создании роли:', error);
        await interaction.editReply({ content: 'Не удалось создать роль. Проверьте права бота и корректность HEX-кода.', embeds: [], components: [] });
        return;
    }

    // --- Логика выдачи ролей ---

    // 1. Выдать роль "Лидер клана"
    try {
        const leaderRole = await interaction.guild.roles.fetch(config.ROLES.CLAN_LEADER_ID);
        if (leaderRole) {
            await interaction.member.roles.add(leaderRole);
        } else {
            console.warn(`[ПРЕДУПРЕЖДЕНИЕ] Роль лидера клана с ID ${config.ROLES.CLAN_LEADER_ID} не найдена.`);
        }
    } catch (error) {
        console.warn(`[ПРЕДУПРЕЖДЕНИЕ] Не удалось выдать роль лидера клана пользователю ${interaction.user.tag}.`, error);
    }
    
    // 2. Собрать всех участников и выдать им новую роль клана
    const memberIds = new Set([interaction.user.id]); // Начинаем с лидера
    const rosterLines = session.data.roster.split('\n').filter(l => l.trim());
    for (const line of rosterLines) {
        const parts = line.split(',').map(p => p.trim());
        const discordId = parts[2];
        if (discordId && /^\d{17,19}$/.test(discordId)) {
            memberIds.add(discordId);
        }
    }

    let successCount = 0;
    let failCount = 0;
    const rolePromises = [];

    for (const id of memberIds) {
        rolePromises.push(
            interaction.guild.members.fetch(id)
                .then(member => member.roles.add(newRole))
                .then(() => successCount++)
                .catch(() => failCount++)
        );
    }
    await Promise.allSettled(rolePromises);
    console.log(`[РЕГИСТРАЦИЯ КЛАНА] Роль "${newRole.name}" выдана ${successCount} участникам. Не найдено на сервере: ${failCount}.`);


    const clansCollection = getClansCollection();
    const clanData = { ...session.data, status: 'approved', roleId: newRole.id, creatorId: interaction.user.id, creatorTag: interaction.user.tag, guildId: interaction.guild.id, createdAt: new Date(), };
    await clansCollection.insertOne(clanData);

    const reviewChannelId = config.REVIEW_CHANNEL_ID;
    if (reviewChannelId) {
        try {
            const reviewChannel = await interaction.guild.channels.fetch(reviewChannelId);
            await reviewChannel.send(embeds.createLogEmbed(interaction, session, newRole));
        } catch (error) { console.error(`!! Ошибка отправки лога в канал (ID: ${reviewChannelId}).`, error); }
    }
    
    // --- Публикация в общедоступном реестре ---
    const registryChannelId = config.CHANNELS.CLAN_REGISTRY;
    if (registryChannelId) {
        try {
            const registryChannel = await interaction.guild.channels.fetch(registryChannelId);
            const registryEmbed = embeds.createRegistryEmbed(clanData);
            await registryChannel.send({ embeds: [registryEmbed] });
        } catch (error) {
            console.error(`!! Ошибка отправки сообщения в реестр кланов (ID: ${registryChannelId}).`, error);
        }
    }
    // --- Конец блока публикации ---
    
    await interaction.editReply({ ...embeds.createSuccessEmbed(interaction, session.data, newRole), flags: [MessageFlags.Ephemeral] });
}

module.exports = {
    handleButton,
    handleModalSubmit,
};