const { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } = require('discord.js');
const { EMOJIS } = require('../../config');

function createBasicInfoModal() {
    return new ModalBuilder()
        .setCustomId('clan_create_step1_modal')
        .setTitle('Шаг 1: Основные данные клана')
        .addComponents(
            new ActionRowBuilder().addComponents(
                new TextInputBuilder()
                    .setCustomId('clan_tag')
                    .setLabel(`${EMOJIS.CROWN} Тег клана (2-6 символов)`)
                    .setStyle(TextInputStyle.Short)
                    .setMinLength(2).setMaxLength(6)
                    .setPlaceholder('FIRE, ELIT, DRAG...')
                    .setRequired(true)
            ),
            new ActionRowBuilder().addComponents(
                new TextInputBuilder()
                    .setCustomId('clan_name')
                    .setLabel(`${EMOJIS.STAR} Полное название клана`)
                    .setStyle(TextInputStyle.Short)
                    .setMinLength(3).setMaxLength(50)
                    .setPlaceholder('Огненные Драконы...')
                    .setRequired(true)
            ),
            new ActionRowBuilder().addComponents(
                new TextInputBuilder()
                    .setCustomId('clan_description')
                    .setLabel(`${EMOJIS.MAGIC} Описание клана (мин. 20 символов)`)
                    .setStyle(TextInputStyle.Paragraph)
                    .setMinLength(20).setMaxLength(500)
                    .setPlaceholder('Опишите цели, принципы, стиль игры...')
                    .setRequired(true)
            ),
            new ActionRowBuilder().addComponents(
                new TextInputBuilder()
                    .setCustomId('clan_color')
                    .setLabel(`${EMOJIS.SPARKLES} Цвет роли (HEX код, например #FF5733)`)
                    .setStyle(TextInputStyle.Short)
                    .setMinLength(7).setMaxLength(7)
                    .setPlaceholder('#FF5733')
                    .setRequired(true)
            )
        );
}

function createLeadershipModal() {
    return new ModalBuilder()
        .setCustomId('clan_create_step2_modal')
        .setTitle('Шаг 2: Руководство клана')
        .addComponents(
            new ActionRowBuilder().addComponents(
                new TextInputBuilder()
                    .setCustomId('clan_leader')
                    .setLabel(`${EMOJIS.CROWN} Глава клана (@упоминание или ID)`)
                    .setStyle(TextInputStyle.Short)
                    .setPlaceholder('@username или 123456789012345678')
                    .setRequired(true)
            ),
            new ActionRowBuilder().addComponents(
                new TextInputBuilder()
                    .setCustomId('clan_deputy')
                    .setLabel(`${EMOJIS.SHIELD} Заместитель (необязательно)`)
                    .setStyle(TextInputStyle.Short)
                    .setPlaceholder('@username или ID')
                    .setRequired(false)
            ),
            new ActionRowBuilder().addComponents(
                new TextInputBuilder()
                    .setCustomId('leader_experience')
                    .setLabel(`${EMOJIS.STAR} Опыт и достижения главы`)
                    .setStyle(TextInputStyle.Paragraph)
                    .setMinLength(20).setMaxLength(300)
                    .setPlaceholder('Опыт в играх, руководство командами...')
                    .setRequired(true)
            )
        );
}

function createMembersModal() {
    return new ModalBuilder()
        .setCustomId('clan_create_step3_modal')
        .setTitle('Шаг 3: Состав клана')
        .addComponents(
            new ActionRowBuilder().addComponents(
                new TextInputBuilder()
                    .setCustomId('clan_members')
                    .setLabel(`${EMOJIS.SWORD} Список участников (каждый с новой строки)`)
                    .setStyle(TextInputStyle.Paragraph)
                    .setMinLength(15).setMaxLength(1500)
                    .setPlaceholder('@warrior1\n@fighter2\nили Discord ID')
                    .setRequired(true)
            ),
            new ActionRowBuilder().addComponents(
                new TextInputBuilder()
                    .setCustomId('member_count')
                    .setLabel(`${EMOJIS.STAR} Общее количество участников (цифрой)`)
                    .setStyle(TextInputStyle.Short)
                    .setMinLength(1).setMaxLength(3)
                    .setPlaceholder('5')
                    .setRequired(true)
            )
        );
}

function createAdditionalModal() {
    return new ModalBuilder()
        .setCustomId('clan_create_step4_modal')
        .setTitle('Шаг 4: Дополнительная информация')
        .addComponents(
            new ActionRowBuilder().addComponents(
                new TextInputBuilder()
                    .setCustomId('activity_time')
                    .setLabel(`${EMOJIS.FIRE} Время активности клана`)
                    .setStyle(TextInputStyle.Short)
                    .setPlaceholder('18:00-23:00, выходные весь день')
                    .setRequired(true)
            ),
            new ActionRowBuilder().addComponents(
                new TextInputBuilder()
                    .setCustomId('timezone')
                    .setLabel(`${EMOJIS.STAR} Основной часовой пояс`)
                    .setStyle(TextInputStyle.Short)
                    .setPlaceholder('MSK (UTC+3), EST (UTC-5)...')
                    .setRequired(true)
            ),
            new ActionRowBuilder().addComponents(
                new TextInputBuilder()
                    .setCustomId('specialties')
                    .setLabel(`${EMOJIS.SWORD} Специализация и особенности`)
                    .setStyle(TextInputStyle.Paragraph)
                    .setPlaceholder('PvP бои, рейды, турниры, обучение...')
                    .setRequired(true)
            ),
            new ActionRowBuilder().addComponents(
                new TextInputBuilder()
                    .setCustomId('emblem_url')
                    .setLabel(`${EMOJIS.DIAMOND} URL эмблемы клана (необязательно)`)
                    .setStyle(TextInputStyle.Short)
                    .setPlaceholder('https://example.com/emblem.png')
                    .setRequired(false)
            )
        );
}

module.exports = {
    createBasicInfoModal,
    createLeadershipModal,
    createMembersModal,
    createAdditionalModal
};