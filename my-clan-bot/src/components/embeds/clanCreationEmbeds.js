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
        .setDescription(
            `${EMOJIS.MAGIC} **Добро пожаловать в систему создания кланов!**\n\n` +
            `${EMOJIS.SHIELD} **Требования:**\n` +
            `› Минимум **5 активных участников**\n` +
            `› Уникальный тег клана (**2-6 символов**)\n` +
            `› Назначенный глава и заместитель\n\n` +
            `${EMOJIS.ROCKET} **Нажмите кнопку ниже, чтобы начать создание!**`
        )
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
        .setTitle(`${EMOJIS.SPARKLES} ШАГ 1/4: ОСНОВЫ КЛАНА`)
        .setDescription(`${createProgressBar(1, 4)}\n\nЗаложите фундамент вашего клана, указав его название, тег и основную идею.`)
        .setColor(COLORS.PREMIUM)
        .addFields(
            { name: `${EMOJIS.CROWN} Тег и Название`, value: 'Короткий тег и полное, запоминающееся имя.', inline: true },
            { name: `${EMOJIS.MAGIC} Описание`, value: 'Цели, принципы и дух вашего клана.', inline: true }
        )
        .setFooter({ text: `Создание клана для ${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL() });

    const button = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('clan_create_step1_button')
            .setLabel('Заполнить основную информацию')
            .setStyle(ButtonStyle.Primary)
    );
    return { embeds: [embed], components: [button], ephemeral: true };
}

function createStep2Embed(interaction, data) {
    const embed = new EmbedBuilder()
        .setTitle(`${EMOJIS.CROWN} ШАГ 2/4: РУКОВОДСТВО`)
        .setDescription(`${createProgressBar(2, 4)}\n\nКлан **${data.tag} ${data.name}** нуждается в сильных лидерах.`) 
        .setColor(COLORS.GOLD)
        .addFields(
            { name: 'Глава клана', value: 'Главный командир и стратег.', inline: true },
            { name: 'Заместитель', value: 'Правая рука главы.', inline: true }
        )
        .setFooter({ text: `Создание клана для ${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL() });
    
    const button = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('clan_create_step2_button')
            .setLabel('Назначить руководство')
            .setStyle(ButtonStyle.Success)
    );
    return { embeds: [embed], components: [button], ephemeral: true };
}

function createStep3Embed(interaction, data) {
    const embed = new EmbedBuilder()
        .setTitle(`${EMOJIS.SHIELD} ШАГ 3/4: СОСТАВ КЛАНА`)
        .setDescription(`${createProgressBar(3, 4)}\n\nВремя собрать команду для клана **${data.tag} ${data.name}**.`)
        .setColor(COLORS.WARNING)
        .addFields(
            { name: 'Список участников', value: 'Перечислите всех, кто будет в клане.', inline: true },
            { name: 'Количество', value: 'Укажите общее число бойцов.', inline: true }
        )
        .setFooter({ text: `Создание клана для ${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL() });

    const button = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('clan_create_step3_button')
            .setLabel('Собрать команду')
            .setStyle(ButtonStyle.Secondary)
    );
    return { embeds: [embed], components: [button], ephemeral: true };
}

function createStep4Embed(interaction, data) {
    const embed = new EmbedBuilder()
        .setTitle(`${EMOJIS.MAGIC} ШАГ 4/4: ДОПОЛНИТЕЛЬНО`)
        .setDescription(`${createProgressBar(4, 4)}\n\nПоследние штрихи для клана **${data.tag} ${data.name}**.`)
        .setColor(COLORS.PREMIUM)
        .addFields(
            { name: 'Активность', value: 'Укажите время и часовой пояс.', inline: true },
            { name: 'Специализация', value: 'В чем силен ваш клан?', inline: true }
        )
        .setFooter({ text: `Создание клана для ${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL() });

    const button = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('clan_create_step4_button')
            .setLabel('Добавить детали')
            .setStyle(ButtonStyle.Secondary)
    );
    return { embeds: [embed], components: [button], ephemeral: true };
}

function createFinalConfirmationEmbed(interaction, session) {
    const { data, startTime } = session;
    const timeSpent = Math.round((Date.now() - startTime) / 60000); 

    const embed = new EmbedBuilder()
        .setTitle(`${EMOJIS.CLAN} **${data.tag} ${data.name}** | ПРЕДПРОСМОТР`) 
        .setDescription(`**Описание:**\n${data.description}\n\n*Заявка заполнена за ~${timeSpent} мин.*`)
        .setColor(data.color.startsWith('#') ? data.color : `#${data.color}`)
        .addFields(
            { name: 'Руководство', value: `**Глава:** ${data.leader}\n**Зам:** ${data.deputy}`, inline: true },
            { name: 'Состав', value: `**Участников:** ${data.memberCount}`, inline: true },
            { name: 'Активность', value: `**Время:** ${data.activityTime} (${data.timezone})`, inline: true },
            { name: 'Опыт главы', value: `>>> ${data.experience}` },
            { name: 'Специализация', value: `>>> ${data.specialties}` }
        )
        .setFooter({ text: 'Проверьте все данные перед отправкой.' });

    if (data.emblem) embed.setThumbnail(data.emblem);

    const buttons = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('clan_create_confirm')
            .setLabel('Подтвердить и отправить')
            .setStyle(ButtonStyle.Success)
            .setEmoji(EMOJIS.ROCKET),
        new ButtonBuilder()
            .setCustomId('clan_create_edit')
            .setLabel('Изменить данные')
            .setStyle(ButtonStyle.Secondary)
    );
    return { content: `**Ваша заявка почти готова!**`, embeds: [embed], components: [buttons], ephemeral: true };
}

function createSuccessEmbed(interaction, data, newRole) {
    const embed = new EmbedBuilder()
        .setTitle(`${EMOJIS.SPARKLES} КЛАН УСПЕШНО СОЗДАН!`)
        .setDescription(
            `Ваш клан **${data.tag} ${data.name}** был успешно зарегистрирован в системе.\n\n` + 
            `✅ Роль <@&${newRole.id}> была автоматически создана для вашего клана.`
            )
        .setColor(COLORS.SUCCESS)
        .setTimestamp()
        .setFooter({ text: `Поздравляем с созданием клана!`, iconURL: interaction.guild.iconURL() });
    return { content: '', embeds: [embed], components: [] };
}

function createEditModeEmbed() {
    const embed = new EmbedBuilder()
        .setTitle(`${EMOJIS.MAGIC} РЕЖИМ РЕДАКТИРОВАНИЯ`)
        .setDescription(`Вы решили изменить данные. Сейчас мы вернемся к первому шагу. Ваши предыдущие ответы будут перезаписаны.`)
        .setColor(COLORS.WARNING);
    return { content: '', embeds: [embed], components: [], ephemeral: true };
}

function createLogEmbed(interaction, session, newRole) {
    const { data } = session;
    const embed = new EmbedBuilder()
        .setAuthor({ name: `Инициатор: ${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL() })
        .setTitle(`✅ Авто-создание клана`)
        .setDescription(
            `**Тег:** ${data.tag}\n` +
            `**Название:** ${data.name}\n` +
            `**Созданная роль:** <@&${newRole.id}>`
        )
        .setColor(COLORS.SUCCESS)
        .addFields(
            { name: `${EMOJIS.PENCIL} Описание клана`, value: `>>> ${data.description}` },
            { name: `${EMOJIS.CROWN} Руководство`, value: `**Глава:** ${data.leader}\n**Заместитель:** ${data.deputy}`, inline: true },
            { name: `${EMOJIS.SHIELD} Состав`, value: `**Всего:** ${data.memberCount} участников`, inline: true },
            { name: `${EMOJIS.FIRE} Активность`, value: `**Время:** ${data.activityTime} (${data.timezone})`, inline: true },
            { name: `${EMOJIS.STAR} Опыт главы`, value: `>>> ${data.experience}` },
            { name: `${EMOJIS.SWORD} Специализация`, value: `>>> ${data.specialties}` },
            { name: `${EMOJIS.USERS} Список участников`, value: `\`\`\`\n${data.members}\n\`\`\`` }
        )
        .setFooter({ text: `ID Заявителя: ${interaction.user.id}` })
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
    createStep4Embed,
    createFinalConfirmationEmbed,
    createSuccessEmbed,
    createEditModeEmbed,
    createLogEmbed,
};