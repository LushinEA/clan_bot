const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { COLORS, EMOJIS, CHANNELS } = require('../../config');

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
        .setColor(COLORS.PREMIUM)
        .setDescription(
            `Добро пожаловать в автоматизированную систему создания клана! Процесс состоит из нескольких шагов и займет пару минут.\n\n` +
            `${EMOJIS.PENCIL} **Перед тем как нажать кнопку, пожалуйста, ознакомьтесь с требованиями и подготовьте всю необходимую информацию.**`
        )
        .addFields(
            {
                name: '✅ ТРЕБОВАНИЯ К КЛАНУ',
                value: '>>> • **Минимальный состав:** `5` активных участников (включая главу).\n' +
                       '• **Уникальность:** Название, тег и HEX-код цвета не должны дублировать уже существующие кланы.',
                inline: false
            },
            {
                name: '📋 ЧТО НУЖНО ПОДГОТОВИТЬ',
                value: '**1. Общая информация:**\n' +
                       '> • Полное название и короткий тег (2-7 симв.)\n' +
                       '> • HEX-код цвета для роли (например, `FF5733`)\n' +
                       '> • Ваш основной игровой сервер\n\n' +
                       '**2. Информация о главе:**\n' +
                       '> • Ваш игровой никнейм\n' +
                       '> • Ваш SteamID64 (*17 цифр*)\n\n' +
                       '**3. Состав клана:**\n' +
                       '> • Список всех участников (каждый с новой строки) в формате:\n' +
                       '> `Игровой ник, SteamID64, Discord ID`\n\n' +
                       '**4. Эмблема (необязательно):**\n' +
                       '> • Квадратное изображение (PNG/JPG)',
                inline: false
            }
        )
        .setFooter({ text: 'Когда все данные будут готовы, нажмите кнопку ниже.' })
        .setImage('https://i.imgur.com/your-banner-image.png'); // Вы можете заменить это изображение на более подходящее

    const button = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('clan_create_start')
            .setLabel(`${EMOJIS.ROCKET} НАЧАТЬ РЕГИСТРАЦИЮ`)
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
    const memberCount = 1 + (data.roster ? data.roster.split('\n').filter(l => l.trim()).length : 0);
    const steamLink = /^\d{17}$/.test(data.leader_steamid) ? `[Профиль](https://steamcommunity.com/profiles/${data.leader_steamid})` : '`Некорректный ID`';

    const embed = new EmbedBuilder()
        .setTitle(`${EMOJIS.PENCIL} ПРОВЕРКА ДАННЫХ ПЕРЕД СОЗДАНИЕМ`)
        .setColor(data.color)
        .setDescription(
            `**Пожалуйста, внимательно проверьте всю информацию.**\n` +
            `После подтверждения будет создана роль для вашего клана и заявка будет отправлена на регистрацию.`
        )
        .addFields(
            { name: 'Название и тег клана', value: `**\`${data.tag}\` ${data.name}**`, inline: false },
            { name: 'Цвет роли', value: `\`${data.color.toUpperCase()}\``, inline: true },
            { name: 'Основной сервер', value: data.server, inline: true },
            { name: 'Общее кол-во участников', value: `\`${memberCount}\` чел.`, inline: true },
            { 
                name: `${EMOJIS.CROWN} Глава клана`, 
                value: `**Ник:** ${data.leader_nick}\n**Discord:** <@${data.leader_discordid}>\n**Steam:** ${steamLink}`, 
                inline: false 
            }
        )
        .setFooter({ text: 'Нажмите "Подтвердить", если все верно, или "Начать заново" для исправления.' });
    
    if (data.emblem) {
        embed.setThumbnail(data.emblem);
    }
        
    const buttons = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('clan_create_confirm').setLabel('Подтвердить и создать клан').setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId('clan_create_edit').setLabel('Начать заново').setStyle(ButtonStyle.Danger)
    );
    return { content: `**Финальный шаг! Проверьте данные ниже.**\n*Полный состав клана будет виден администрации в логах.*`, embeds: [embed], components: [buttons] };
}

function createSuccessEmbed(interaction, data, newRole) {
    const embed = new EmbedBuilder()
        .setTitle(`${EMOJIS.ROCKET} КЛАН "${data.name}" УСПЕШНО СОЗДАН!`)
        .setColor(COLORS.SUCCESS)
        .setDescription(
            `Поздравляем с регистрацией вашего клана! Вот что произошло и что делать дальше:`
        )
        .addFields(
            { 
                name: '✅ Роли созданы и распределены', 
                value: `Создана роль <@&${newRole.id}>. Она была автоматически выдана всем участникам клана, найденным на сервере.\nВам, как главе, дополнительно выдана роль "Лидер клана".`,
                inline: false
            },
            {
                name: `${EMOJIS.PENCIL} Что дальше?`,
                value: `1. **Проверьте реестр**: Ваш клан добавлен в канал <#${CHANNELS.CLAN_REGISTRY}>.\n` +
                       `2. **Новые участники**: Если в клан вступают новые игроки, они могут получить роль в канале <#${CHANNELS.CLAN_INSIGNIA}>.`,
                inline: false
            }
        )
        .setFooter({ text: 'Добро пожаловать в клановую систему!' });

    if (data.emblem) {
        embed.setThumbnail(data.emblem);
    }
    
    return { content: `Поздравляем, <@${interaction.user.id}>!`, embeds: [embed], components: [] };
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
 * ЛОГ-СООБЩЕНИЕ
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