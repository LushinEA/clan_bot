const embeds = require('../components/embeds/clanCreationEmbeds');
const modals = require('../components/modals/clanCreationModals');
const { getClansCollection } = require('../utils/database');
const { handleInteractionError } = require('../utils/errorHandler');
const config = require('../config');

// Хранение данных пользователей в памяти на время сессии регистрации
const registrationSessions = new Map();

async function start(interaction) {
    const userId = interaction.user.id;
    if (registrationSessions.has(userId)) {
        await interaction.reply({ content: 'Вы уже находитесь в процессе создания клана.', ephemeral: true });
        return;
    }
    registrationSessions.set(userId, { step: 1, data: {}, startTime: Date.now() });
    const reply = embeds.createStep1Embed(interaction);
    await interaction.reply(reply);
}

async function handleButton(interaction) {
    const userId = interaction.user.id;
    const session = registrationSessions.get(userId);
    
    if (!session && interaction.customId !== 'clan_create_start') {
        console.warn(`Пользователь ${interaction.user.tag} нажал кнопку "${interaction.customId}", но его сессия не найдена (возможно, истекла).`);
        await interaction.reply({ content: '⏳ Ваша сессия создания клана истекла. Пожалуйста, начните заново, нажав на главную кнопку.', ephemeral: true });
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
                await interaction.showModal(modals.createLeadershipModal());
                break;
            case 'clan_create_step3_button':
                await interaction.showModal(modals.createMembersModal());
                break;
            case 'clan_create_step4_button':
                await interaction.showModal(modals.createAdditionalModal());
                break;
            case 'clan_create_confirm':
                await submitAndCreateClan(interaction, session); 
                registrationSessions.delete(userId);
                break;
            case 'clan_create_edit':
                await editClanData(interaction, session);
                break;
        }
    } catch (error) {
        await handleInteractionError(error, interaction, `handleButton: ${interaction.customId}`);
    }
}

async function handleModalSubmit(interaction) {
    const userId = interaction.user.id;
    const session = registrationSessions.get(userId);

    if (!session) {
        console.warn(`Пользователь ${interaction.user.tag} отправил модальное окно "${interaction.customId}", но его сессия не найдена.`);
        await interaction.reply({ content: '⏳ Ваша сессия создания клана истекла. Пожалуйста, начните заново.', ephemeral: true });
        return;
    }
    try {
        await interaction.deferUpdate();
        
        switch (interaction.customId) {
            case 'clan_create_step1_modal':
                session.data.tag = interaction.fields.getTextInputValue('clan_tag').toUpperCase();
                session.data.name = interaction.fields.getTextInputValue('clan_name');
                session.data.description = interaction.fields.getTextInputValue('clan_description');
                session.data.color = interaction.fields.getTextInputValue('clan_color');
                session.step = 2;
                await interaction.editReply(embeds.createStep2Embed(interaction, session.data));
                break;
            case 'clan_create_step2_modal':
                session.data.leader = interaction.fields.getTextInputValue('clan_leader');
                session.data.deputy = interaction.fields.getTextInputValue('clan_deputy') || 'Не назначен';
                session.data.experience = interaction.fields.getTextInputValue('leader_experience');
                session.step = 3;
                await interaction.editReply(embeds.createStep3Embed(interaction, session.data));
                break;
            case 'clan_create_step3_modal':
                session.data.members = interaction.fields.getTextInputValue('clan_members');
                session.data.memberCount = interaction.fields.getTextInputValue('member_count');
                session.step = 4;
                await interaction.editReply(embeds.createStep4Embed(interaction, session.data));
                break;
            case 'clan_create_step4_modal':
                session.data.activityTime = interaction.fields.getTextInputValue('activity_time');
                session.data.timezone = interaction.fields.getTextInputValue('timezone');
                session.data.specialties = interaction.fields.getTextInputValue('specialties');
                session.data.emblem = interaction.fields.getTextInputValue('emblem_url') || null;
                session.step = 5;
                await interaction.editReply(embeds.createFinalConfirmationEmbed(interaction, session));
                break;
        }
    } catch (error) {
        await handleInteractionError(error, interaction, `handleModalSubmit: ${interaction.customId}`);
    }
}

async function editClanData(interaction, session) {
    session.step = 1;
    await interaction.update(embeds.createEditModeEmbed());
    setTimeout(async () => {
        await interaction.editReply(embeds.createStep1Embed(interaction));
    }, 2000);
}

async function submitAndCreateClan(interaction, session) {
    // 1. Создание роли
    let newRole;
    try {
        newRole = await interaction.guild.roles.create({
            name: session.data.tag,
            color: session.data.color,
            mentionable: false,
            reason: `Автоматическое создание роли для клана ${session.data.name}`
        });
        console.log(`✅ Роль [${newRole.name}] успешно создана для клана ${session.data.name}.`);
    } catch (error) {
        console.error('❌ Ошибка при создании роли:', error);
        await interaction.update({ content: 'Не удалось создать роль. Проверьте права бота (у него должна быть роль с правом "Управление ролями" выше создаваемой) и корректность HEX-кода цвета.', embeds: [], components: [], ephemeral: true });
        return;
    }

    // 2. Подготовка данных для БД
    const clansCollection = getClansCollection();
    const clanData = {
        ...session.data,
        status: 'approved',
        roleId: newRole.id,
        creatorId: interaction.user.id,
        creatorTag: interaction.user.tag,
        guildId: interaction.guild.id,
        createdAt: new Date(),
    };

    // 3. Сохранение в базу данных
    await clansCollection.insertOne(clanData);

    // 4. Отправка лога в канал для админов
    const reviewChannelId = config.REVIEW_CHANNEL_ID;
    if (reviewChannelId) {
        try {
            const reviewChannel = await interaction.guild.channels.fetch(reviewChannelId);
            const logMessage = embeds.createLogEmbed(interaction, session, newRole); // Вызов изменен
            await reviewChannel.send(logMessage);
        } catch (error) {
            console.error(`!! Ошибка отправки лога в канал (ID: ${reviewChannelId}).`, error);
        }
    }

    // 5. Отправка сообщения об успехе пользователю
    await interaction.update(embeds.createSuccessEmbed(interaction, session.data, newRole));
}

module.exports = {
    handleButton,
    handleModalSubmit,
};