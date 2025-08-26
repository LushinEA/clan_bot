const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { COLORS, EMOJIS } = require('../../config');

function createProgressBar(currentStep, totalSteps = 4) {
    const filledBlocks = Math.round((currentStep / totalSteps) * 10);
    const emptyBlocks = 10 - filledBlocks;
    const progress = EMOJIS.PROGRESS_FILLED.repeat(filledBlocks) + EMOJIS.PROGRESS_EMPTY.repeat(emptyBlocks);
    const percentage = Math.round((currentStep / totalSteps) * 100);
    return `${progress} **${percentage}%**`;
}

function createMainEmbed() {
    const embed = new EmbedBuilder()
        .setTitle(`${EMOJIS.CLAN} **СИСТЕМА РЕГИСТРАЦИИ КЛАНОВ** ${EMOJIS.SPARKLES}`)
        .setDescription(`${EMOJIS.ROCKET} **Нажмите кнопку ниже, чтобы начать создание вашего клана!**`)
        .setColor(COLORS.PREMIUM)
        .setImage('https://i.imgur.com/your-banner-image.png');

    const button = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('clan_create_start')
            .setLabel(`${EMOJIS.ROCKET} СОЗДАТЬ КЛАН`)
            .setStyle(ButtonStyle.Primary)
    );
    return { embeds: [embed], components: [button] };
}

function createStep1Embed(interaction) {
    const embed = new EmbedBuilder()
        .setTitle(`${EMOJIS.SHIELD} ШАГ 1/4: ОСНОВНАЯ ИНФОРМАЦИЯ`)
        .setDescription(`${createProgressBar(1, 4)}\n\nУкажите название, тег и другие базовые данные вашего клана.`)
        .setColor(COLORS.PRIMARY)
        .setFooter({ text: `Заявка от ${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL() });

    const button = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('clan_create_step1_button').setLabel('Заполнить информацию').setStyle(ButtonStyle.Primary)
    );
    return { embeds: [embed], components: [button] };
}

function createStep2Embed(interaction, data) {
    const embed = new EmbedBuilder()
        .setTitle(`${EMOJIS.CROWN} ШАГ 2/4: ИНФОРМАЦИЯ О ГЛАВЕ`)
        .setDescription(`${createProgressBar(2, 4)}\n\nТеперь введите информацию о себе как о главе клана.`)
        .setColor(COLORS.GOLD)
        .setFooter({ text: `Клан: ${data.tag} ${data.name}`, iconURL: interaction.user.displayAvatarURL() });
    
    const button = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('clan_create_step2_button').setLabel('Заполнить данные главы').setStyle(ButtonStyle.Success)
    );
    return { embeds: [embed], components: [button] };
}

function createStep3Embed(interaction, data) {
    const embed = new EmbedBuilder()
        .setTitle(`${EMOJIS.USERS} ШАГ 3/4: СОСТАВ КЛАНА`)
        .setDescription(`${createProgressBar(3, 4)}\n\nПеречислите всех участников вашего клана.`)
        .setColor(COLORS.WARNING)
        .setFooter({ text: `Клан: ${data.tag} ${data.name}`, iconURL: interaction.user.displayAvatarURL() });

    const button = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('clan_create_step3_button').setLabel('Заполнить состав').setStyle(ButtonStyle.Secondary)
    );
    return { embeds: [embed], components: [button] };
}

function createEmblemRequestEmbed(interaction, data) {
    const embed = new EmbedBuilder()
        .setTitle(`${EMOJIS.DIAMOND} ШАГ 4/4: ЭМБЛЕМА КЛАНА (НЕОБЯЗАТЕЛЬНО)`)
        .setDescription(`${createProgressBar(4, 4)}\n\n${EMOJIS.LOADING} **Отправьте картинку эмблемы следующим сообщением.**\nУ вас есть 60 секунд.\n\nЕсли у вас нет эмблемы, просто нажмите "Пропустить".`)
        .setColor(COLORS.PREMIUM)
        .setFooter({ text: `Клан: ${data.tag} ${data.name}`, iconURL: interaction.user.displayAvatarURL() });

    const button = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('clan_emblem_skip').setLabel('Пропустить').setStyle(ButtonStyle.Secondary)
    );
    return { embeds: [embed], components: [button] };
}


function createFinalConfirmationEmbed(interaction, session) {
    const { data } = session;
    const embed = new EmbedBuilder()
        .setTitle(`${EMOJIS.CLAN} **${data.tag} ${data.name}** | ПРЕДПРОСМОТР`)
        .setColor(data.color)
        .addFields(
            { name: 'Основной сервер', value: data.server, inline: true },
            { name: 'Глава клана', value: `${data.leader_nick} (<@${data.leader_discordid}>)`, inline: true }
        );
    
    if (data.emblem) {
        embed.setThumbnail(data.emblem);
    }
        
    const buttons = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('clan_create_confirm').setLabel('Подтвердить и создать клан').setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId('clan_create_edit').setLabel('Начать заново').setStyle(ButtonStyle.Danger)
    );
    return { content: `**Пожалуйста, проверьте все данные.**\n*Состав клана будет виден в логах для администрации.*`, embeds: [embed], components: [buttons] };
}

function createSuccessEmbed(interaction, data, newRole) {
    const embed = new EmbedBuilder()
        .setTitle(`${EMOJIS.SPARKLES} КЛАН УСПЕШНО ЗАРЕГИСТРИРОВАН!`)
        .setDescription(`Ваш клан **${data.tag} ${data.name}** был зарегистрирован.\n\nРоль <@&${newRole.id}> создана.`)
        .setColor(COLORS.SUCCESS);
    return { content: '', embeds: [embed], components: [] };
}

/**
 * Форматирует состав в кликабельный текстовый список.
 * @param {string} rosterString - Сырая строка со списком участников.
 * @returns {string} - Отформатированный нумерованный список.
 */
function formatRosterAsTextList(rosterString) {
    const lines = rosterString.split('\n').filter(l => l.trim());
    const formattedLines = [];

    formattedLines.push('**`No. | Никнейм | Discord | Steam`**');

    for (let i = 0; i < lines.length; i++) {
        const parts = lines[i].split(',').map(p => p.trim());
        const nick = parts[0] || '`N/A`';
        const steamId = parts[1] || null;
        const discordId = parts[2] || null;

        const discordMention = /^\d{17,19}$/.test(discordId) ? `<@${discordId}>` : '`N/A`';
        const steamLink = /^\d{17}$/.test(steamId) ? `[Профиль](https://steamcommunity.com/profiles/${steamId})` : '`N/A`';
        
        const row = `${i + 1}. **${nick}** | ${discordMention} | ${steamLink}`;
        formattedLines.push(row);
    }

    let output = formattedLines.join('\n');
    if (output.length > 1024) {
        output = output.slice(0, 1020) + '\n...';
    }

    return output;
}

/**
 * ФИНАЛЬНАЯ ВЕРСИЯ ЛОГ-СООБЩЕНИЯ
 */
function createLogEmbed(interaction, session, newRole) {
    const { data } = session;
    
    const fullRosterString = `${data.leader_nick}, ${data.leader_steamid}, ${data.leader_discordid}\n${data.roster}`;
    const memberCount = fullRosterString.split('\n').filter(l => l.trim()).length;

    const embed = new EmbedBuilder()
        .setAuthor({ name: `Клан зарегистрировал: ${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL() })
        .setTitle(`✅ Новый клан`)
        .setColor(data.color)
        .setDescription(
            `**Тег:** ${data.tag}\n` +
            `**Название:** ${data.name}\n` +
            `**Созданная роль:** <@&${newRole.id}>`
        )
        .addFields(
            { name: 'Основной сервер', value: data.server },
            { name: '👑 Руководство', value: `Глава: <@${data.leader_discordid}>` },
            { name: `🛡️ Состав (${memberCount} участников)`, value: formatRosterAsTextList(fullRosterString) }
        )
        .setTimestamp();
    
    if (data.emblem) {
        embed.setThumbnail(data.emblem);
    }
    return { embeds: [embed] };
}

module.exports = {
    createMainEmbed,
    createStep1Embed,
    createStep2Embed,
    createStep3Embed,
    createEmblemRequestEmbed,
    createFinalConfirmationEmbed,
    createSuccessEmbed,
    createLogEmbed,
};