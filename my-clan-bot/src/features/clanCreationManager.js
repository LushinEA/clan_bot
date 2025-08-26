const { Collection, MessageFlags } = require('discord.js');
const embeds = require('../components/embeds/clanCreationEmbeds');
const modals = require('../components/modals/clanCreationModals');
const { getClansCollection } = require('../utils/database');
const { handleInteractionError } = require('../utils/errorHandler');
const config = require('../config');
const { updateInsigniaPanel } = require('./insigniaManager');
const { findUserClan, validateUniqueness, validateRosterMembers } = require('../utils/validationHelper');

const registrationSessions = new Map();

async function start(interaction) {
    const userId = interaction.user.id;

    // --- ПРОВЕРКА: Состоит ли пользователь уже в клане ---
    const userClan = await findUserClan({ discordId: userId });
    if (userClan) {
        await interaction.reply({
            content: `🛡️ Вы не можете создать новый клан, так как уже состоите в клане **\`${userClan.tag}\` ${userClan.name}**.`,
            flags: [MessageFlags.Ephemeral]
        });
        return;
    }
    // --- КОНЕЦ ПРОВЕРКИ ---

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
            case 'clan_create_step1_modal': {
                const tag = interaction.fields.getTextInputValue('clan_tag');
                const name = interaction.fields.getTextInputValue('clan_name');
                const color = interaction.fields.getTextInputValue('clan_color');
                const server = interaction.fields.getTextInputValue('clan_server');

                // --- ВАЛИДАЦИЯ ---
                const hexRegex = /^[0-9A-F]{6}$/i;
                if (!hexRegex.test(color)) {
                    await interaction.followUp({ 
                        content: '❌ **Ошибка!** Неверный формат HEX-кода цвета. Введите 6 символов от 0-9 и A-F (например, `FF5733`). Пожалуйста, нажмите кнопку "Заполнить информацию" еще раз.', 
                        flags: [MessageFlags.Ephemeral] 
                    });
                    return;
                }

                if (!Object.keys(config.SERVERS).includes(server)) {
                    await interaction.followUp({ 
                        content: '❌ **Ошибка!** Неверный номер сервера. Укажите одну цифру от 1 до 4. Пожалуйста, нажмите кнопку "Заполнить информацию" еще раз.', 
                        flags: [MessageFlags.Ephemeral] 
                    });
                    return;
                }

                // --- ПРОВЕРКА: Уникальность тега, имени и цвета ---
                const uniquenessCheck = await validateUniqueness({ tag, name, color: '#' + color.toUpperCase() });
                if (!uniquenessCheck.isValid) {
                    await interaction.followUp({ content: uniquenessCheck.message, flags: [MessageFlags.Ephemeral] });
                    return;
                }
                // --- КОНЕЦ ПРОВЕРКИ ---

                session.data.tag = tag;
                session.data.name = name;
                session.data.color = '#' + color.toUpperCase();
                session.data.server = server;
                
                if (session.isEditing) {
                    session.step = 2;
                    await interaction.editReply(embeds.createStep2Embed(interaction, session.data));
                } else {
                    session.step = 2;
                    await interaction.editReply(embeds.createStep2Embed(interaction, session.data));
                }
                break;
            }
            case 'clan_create_step2_modal': {
                const leaderNick = interaction.fields.getTextInputValue('leader_nick');
                const leaderSteamId = interaction.fields.getTextInputValue('leader_steamid');
                const leaderDiscordId = interaction.user.id;

                // --- ВАЛИДАЦИЯ ФОРМАТА SteamID64 ---
                const steamIdRegex = /^\d{17}$/;
                if (!steamIdRegex.test(leaderSteamId)) {
                     await interaction.followUp({ 
                        content: '❌ **Ошибка!** Неверный формат SteamID64. Он должен состоять ровно из 17 цифр. Пожалуйста, нажмите кнопку "Заполнить данные главы" еще раз.', 
                        flags: [MessageFlags.Ephemeral] 
                    });
                    return;
                }

                // --- ПРОВЕРКА: Не состоит ли SteamID или Discord ID главы в другом клане ---
                // Здесь мы проверяем, не занят ли указанный SteamID или Discord ID текущего пользователя
                // в *любом* другом клане (не только тем, который он создает, что очевидно).
                const existingLeaderClan = await findUserClan({ discordId: leaderDiscordId, steamId: leaderSteamId });
                if (existingLeaderClan) {
                    await interaction.followUp({
                        content: `❌ **Ошибка!** Ваш Discord ID (<@${leaderDiscordId}>) или SteamID (\`${leaderSteamId}\`) уже зарегистрированы в клане **\`${existingLeaderClan.tag}\` ${existingLeaderClan.name}**. Чтобы создать новый клан, вы должны сначала покинуть текущий.`,
                        flags: [MessageFlags.Ephemeral]
                    });
                    return;
                }
                // --- КОНЕЦ НОВОЙ ПРОВЕРКИ ---

                session.data.leader_nick = leaderNick;
                session.data.leader_steamid = leaderSteamId;
                session.data.leader_discordid = leaderDiscordId;

                if (session.isEditing) {
                    session.step = 3;
                    await interaction.editReply(embeds.createStep3Embed(interaction, session.data));
                } else {
                    session.step = 3;
                    await interaction.editReply(embeds.createStep3Embed(interaction, session.data));
                }
                break;
            }
            case 'clan_create_step3_modal': {
                const roster = interaction.fields.getTextInputValue('clan_roster');

                // --- УСИЛЕННАЯ ВАЛИДАЦИЯ ФОРМАТА СОСТАВА ---
                const lines = roster.split('\n').filter(line => line.trim() !== '');
                const steamIdRegex = /^\d{17}$/;
                const discordIdRegex = /^\d{17,19}$/;

                for (let i = 0; i < lines.length; i++) {
                    const line = lines[i];
                    const parts = line.split(',').map(p => p.trim());

                    if (parts.length !== 3) {
                        await interaction.followUp({ 
                            content: `❌ **Ошибка в строке ${i + 1}:** \`${line}\`\nНеверный формат. Ожидается: \`Никнейм, SteamID, DiscordID\`. Пожалуйста, исправьте и попробуйте снова.`, 
                            flags: [MessageFlags.Ephemeral] 
                        });
                        return;
                    }

                    const [, steamId, discordId] = parts;

                    if (!steamIdRegex.test(steamId)) {
                        await interaction.followUp({ 
                            content: `❌ **Ошибка в строке ${i + 1}:** \`${line}\`\nНеверный формат SteamID \`${steamId}\`. Он должен состоять ровно из 17 цифр.`, 
                            flags: [MessageFlags.Ephemeral] 
                        });
                        return;
                    }

                    if (!discordIdRegex.test(discordId)) {
                         await interaction.followUp({ 
                            content: `❌ **Ошибка в строке ${i + 1}:** \`${line}\`\nНеверный формат Discord ID \`${discordId}\`. Проверьте, что ID скопирован правильно.`, 
                            flags: [MessageFlags.Ephemeral] 
                        });
                        return;
                    }
                }
                
                // --- ПРОВЕРКА: Членство участников в других кланах ---
                // Здесь проверяем, что ни один из добавленных участников не состоит уже в другом клане.
                // Передаем `null` для `clanIdToExclude`, так как это создание нового клана.
                const rosterCheck = await validateRosterMembers(roster);
                if (!rosterCheck.isValid) {
                    await interaction.followUp({ content: rosterCheck.message, flags: [MessageFlags.Ephemeral] });
                    return;
                }
                // --- КОНЕЦ ПРОВЕРКИ ---

                session.data.roster = roster;

                if (session.isEditing) {
                    session.isEditing = false;
                    await interaction.editReply(embeds.createFinalConfirmationEmbed(interaction, session));
                } else {
                    session.step = 4;
                    await askForEmblem(interaction, session);
                }
                break;
            }
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

    // --- Добавляем ВСЕ необходимые данные в сессию ДО создания embed'ов ---
    session.data.roleId = newRole.id;
    session.data.createdAt = new Date();

    // --- Логика выдачи ролей ---
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
    
    const memberIds = new Set([interaction.user.id]);
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

    let logMessageId = null;
    let registryMessageId = null;

    const reviewChannelId = config.REVIEW_CHANNEL_ID;
    if (reviewChannelId) {
        try {
            const reviewChannel = await interaction.guild.channels.fetch(reviewChannelId);
            const logMessage = await reviewChannel.send(embeds.createLogEmbed(interaction.user, session.data, newRole));
            logMessageId = logMessage.id;
        } catch (error) { console.error(`!! Ошибка отправки лога в канал (ID: ${reviewChannelId}).`, error); }
    }
    
    const registryChannelId = config.CHANNELS.CLAN_REGISTRY;
    if (registryChannelId) {
        try {
            const registryChannel = await interaction.guild.channels.fetch(registryChannelId);
            const registryEmbed = embeds.createRegistryEmbed(session.data);
            const registryMessage = await registryChannel.send({ embeds: [registryEmbed] });
            registryMessageId = registryMessage.id;
        } catch (error) {
            console.error(`!! Ошибка отправки сообщения в реестр кланов (ID: ${registryChannelId}).`, error);
        }
    }
    
    const clansCollection = getClansCollection();
    const clanData = { 
        ...session.data, 
        status: 'approved', 
        creatorId: interaction.user.id, 
        creatorTag: interaction.user.tag, 
        guildId: interaction.guild.id, 
        logMessageId: logMessageId,
        registryMessageId: registryMessageId,
    };
    await clansCollection.insertOne(clanData);
    
    await updateInsigniaPanel(interaction.client);
    
    await interaction.editReply({ ...embeds.createSuccessEmbed(interaction, session.data, newRole), flags: [MessageFlags.Ephemeral] });
}

module.exports = {
    handleButton,
    handleModalSubmit,
};