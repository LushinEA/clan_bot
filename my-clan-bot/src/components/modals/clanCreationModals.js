const { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } = require('discord.js');
const { EMOJIS } = require('../../config');

/**
 * ШАГ 1: ОСНОВНАЯ ИНФОРМАЦИЯ
 */
function createBasicInfoModal() {
    return new ModalBuilder()
        .setCustomId('clan_create_step1_modal')
        .setTitle('Шаг 1/3: Основная информация')
        .addComponents(
            new ActionRowBuilder().addComponents(
                new TextInputBuilder()
                    .setCustomId('clan_tag')
                    .setLabel(`${EMOJIS.SWORD} Клан-тег`)
                    .setStyle(TextInputStyle.Short)
                    .setPlaceholder('Например: [1ID] или B-W|')
                    .setMinLength(2)
                    .setMaxLength(7)
                    .setRequired(true)
            ),
            new ActionRowBuilder().addComponents(
                new TextInputBuilder()
                    .setCustomId('clan_name')
                    .setLabel(`${EMOJIS.SHIELD} Полное название клана`)
                    .setStyle(TextInputStyle.Short)
                    .setPlaceholder('Например: 1st Infantry Division')
                    .setRequired(true)
            ),
            new ActionRowBuilder().addComponents(
                new TextInputBuilder()
                    .setCustomId('clan_color')
                    .setLabel(`${EMOJIS.SPARKLES} Цвет роли (6 HEX символов, без #)`)
                    .setStyle(TextInputStyle.Short)
                    .setPlaceholder('Например: FF5733')
                    .setMinLength(6)
                    .setMaxLength(6)
                    .setRequired(true)
            ),
            new ActionRowBuilder().addComponents(
                new TextInputBuilder()
                    .setCustomId('clan_server')
                    .setLabel(`${EMOJIS.ROCKET} Основной игровой сервер`)
                    .setStyle(TextInputStyle.Short)
                    .setPlaceholder('Например: [RU] Bear-W SQUAD Official')
                    .setRequired(true)
            )
        );
}

/**
 * ШАГ 2: ИНФОРМАЦИЯ О ГЛАВЕ КЛАНА
 */
function createLeaderInfoModal() {
    return new ModalBuilder()
        .setCustomId('clan_create_step2_modal')
        .setTitle('Шаг 2/3: Информация о главе клана')
        .addComponents(
            new ActionRowBuilder().addComponents(
                new TextInputBuilder()
                    .setCustomId('leader_nick')
                    .setLabel(`${EMOJIS.CROWN} Ваш игровой никнейм`)
                    .setStyle(TextInputStyle.Short)
                    .setPlaceholder('Ваш ник, который будет вписан в состав')
                    .setRequired(true)
            ),
            new ActionRowBuilder().addComponents(
                new TextInputBuilder()
                    .setCustomId('leader_steamid')
                    .setLabel(`${EMOJIS.ROCKET} Ваш SteamID64`)
                    .setStyle(TextInputStyle.Short)
                    .setPlaceholder('Например: 76561198000000001')
                    .setMinLength(17)
                    .setMaxLength(17)
                    .setRequired(true)
            )
        );
}

/**
 * ШАГ 3: СОСТАВ КЛАНА
 */
function createRosterModal() {
    return new ModalBuilder()
        .setCustomId('clan_create_step3_modal')
        .setTitle('Шаг 3/3: Состав клана')
        .addComponents(
            new ActionRowBuilder().addComponents(
                new TextInputBuilder()
                    .setCustomId('clan_roster')
                    .setLabel(`${EMOJIS.USERS} Список участников (каждый с новой строки)`)
                    .setStyle(TextInputStyle.Paragraph)
                    .setPlaceholder('Никнейм, SteamID, DiscordID')
                    .setRequired(true)
            )
        );
}

module.exports = {
    createBasicInfoModal,
    createLeaderInfoModal,
    createRosterModal,
};