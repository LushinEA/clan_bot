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
    registrationSessions.set(userId, { step: 1, data: {} });
    const reply = embeds.createStep1Embed(interaction);
    await interaction.reply({ ...reply, flags: [MessageFlags.Ephemeral] });
}

async function handleButton(interaction) {
    const userId = interaction.user.id;
    const session = registrationSessions.get(userId);
    
    if (!session && !['clan_create_start'].includes(interaction.customId)) {
        await interaction.reply({ content: '⏳ Ваша сессия создания клана истекла.', flags: [MessageFlags.Ephemeral] });
        return;
    }
    try {
        switch (interaction.customId) {
            case 'clan_create_start':
                await start(interaction);
                break;
            case 'clan_create_step1_button':
                await interaction.showModal(modals.createBasicInfoModal());
                break;
            case 'clan_create_step2_button':
                await interaction.showModal(modals.createLeaderInfoModal());
                break;
            case 'clan_create_step3_button':
                await interaction.showModal(modals.createRosterModal());
                break;
            case 'clan_create_confirm':
                await submitAndCreateClan(interaction, session);
                registrationSessions.delete(userId);
                break;
            case 'clan_create_edit':
                registrationSessions.delete(userId);
                await interaction.update({ content: 'Заявка отменена. Вы можете начать заново.', embeds: [], components: [], flags: [MessageFlags.Ephemeral] });
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
        await interaction.deferUpdate({ flags: [MessageFlags.Ephemeral] });
        
        switch (interaction.customId) {
            case 'clan_create_step1_modal':
                session.data.tag = interaction.fields.getTextInputValue('clan_tag');
                session.data.name = interaction.fields.getTextInputValue('clan_name');
                session.data.color = '#' + interaction.fields.getTextInputValue('clan_color');
                session.data.server = interaction.fields.getTextInputValue('clan_server');
                session.step = 2;
                await interaction.editReply(embeds.createStep2Embed(interaction, session.data));
                break;
            case 'clan_create_step2_modal':
                session.data.leader_nick = interaction.fields.getTextInputValue('leader_nick');
                session.data.leader_steamid = interaction.fields.getTextInputValue('leader_steamid');
                session.data.leader_discordid = interaction.user.id;
                session.step = 3;
                await interaction.editReply(embeds.createStep3Embed(interaction, session.data));
                break;
            case 'clan_create_step3_modal':
                session.data.roster = interaction.fields.getTextInputValue('clan_roster');
                session.step = 4;
                await askForEmblem(interaction, session);
                break;
        }
    } catch (error) {
        await handleInteractionError(error, interaction, `handleModalSubmit: ${interaction.customId}`);
    }
}

async function askForEmblem(interaction, session) {
    await interaction.editReply(embeds.createEmblemRequestEmbed(interaction, session.data));
    
    const filter = (i) => i.customId === 'clan_emblem_skip' && i.user.id === interaction.user.id;
    const collector = interaction.channel.createMessageComponentCollector({ filter, time: 60000, max: 1 });
    
    const messageFilter = (m) => m.author.id === interaction.user.id && m.attachments.size > 0;
    const messageCollector = interaction.channel.createMessageCollector({ filter: messageFilter, time: 60000, max: 1 });

    collector.on('collect', async i => {
        session.data.emblem = null;
        messageCollector.stop();
        await i.update({ ...embeds.createFinalConfirmationEmbed(i, session), flags: [MessageFlags.Ephemeral] });
    });

    messageCollector.on('collect', async m => {
        const attachment = m.attachments.first();
        if (attachment && attachment.contentType?.startsWith('image')) {
            session.data.emblem = attachment.url;
            collector.stop();
            await interaction.editReply({ ...embeds.createFinalConfirmationEmbed(interaction, session), flags: [MessageFlags.Ephemeral] });
            await m.delete().catch(() => {});
        }
    });

    collector.on('end', async (collected, reason) => {
        if (reason === 'time' && messageCollector.collected.size === 0) {
            session.data.emblem = null;
            await interaction.editReply({ ...embeds.createFinalConfirmationEmbed(interaction, session), flags: [MessageFlags.Ephemeral] });
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
        await interaction.editReply({ content: 'Не удалось создать роль. Проверьте права бота и корректность HEX-кода.', embeds: [], components: [], flags: [MessageFlags.Ephemeral] });
        return;
    }

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
    
    await interaction.editReply({ ...embeds.createSuccessEmbed(interaction, session.data, newRole), flags: [MessageFlags.Ephemeral] });
}

module.exports = {
    handleButton,
    handleModalSubmit,
};