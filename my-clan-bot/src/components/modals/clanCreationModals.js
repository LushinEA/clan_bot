const { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } = require('discord.js');
const { EMOJIS } = require('../../config');

/**
 * ШАГ 1: ОСНОВНАЯ ИНФОРМАЦИЯ
 * @param {object} [data={}] - Существующие данные сессии для предзаполнения.
 */
function createBasicInfoModal(data = {}) {
    const modal = new ModalBuilder()
        .setCustomId('clan_create_step1_modal')
        .setTitle('Шаг 1/3: Основная информация');

    // --- Клан-тег ---
    const tagInput = new TextInputBuilder()
        .setCustomId('clan_tag')
        .setLabel(`${EMOJIS.SWORD} Клан-тег`)
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('Например: [1ID] или B-W|')
        .setMinLength(2)
        .setMaxLength(7)
        .setRequired(true);
    if (data.tag) tagInput.setValue(data.tag);

    // --- Название клана ---
    const nameInput = new TextInputBuilder()
        .setCustomId('clan_name')
        .setLabel(`${EMOJIS.SHIELD} Полное название клана`)
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('Например: 1st Infantry Division')
        .setRequired(true);
    if (data.name) nameInput.setValue(data.name);

    // --- Цвет роли ---
    const colorInput = new TextInputBuilder()
        .setCustomId('clan_color')
        .setLabel(`${EMOJIS.SPARKLES} Цвет роли (6 HEX символов, без #)`)
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('Например: FF5733 или 00A8F3')
        .setMinLength(6)
        .setMaxLength(6)
        .setRequired(true);
    if (data.color) colorInput.setValue(data.color.replace('#', ''));

    // --- Сервер ---
    const serverInput = new TextInputBuilder()
        .setCustomId('clan_server')
        .setLabel('Сервер (1=Скучная, 2=Inv, 3=RAAS, 4=GE)')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('Введите одну цифру от 1 до 4')
        .setMinLength(1)
        .setMaxLength(1)
        .setRequired(true);
    if (data.server) serverInput.setValue(data.server);

    modal.addComponents(
        new ActionRowBuilder().addComponents(tagInput),
        new ActionRowBuilder().addComponents(nameInput),
        new ActionRowBuilder().addComponents(colorInput),
        new ActionRowBuilder().addComponents(serverInput)
    );

    return modal;
}

/**
 * ШАГ 2: ИНФОРМАЦИЯ О ГЛАВЕ КЛАНА
 * @param {object} [data={}] - Существующие данные сессии для предзаполнения.
 */
function createLeaderInfoModal(data = {}) {
    const modal = new ModalBuilder()
        .setCustomId('clan_create_step2_modal')
        .setTitle('Шаг 2/3: Информация о главе клана');
    
    // --- Никнейм главы ---
    const nickInput = new TextInputBuilder()
        .setCustomId('leader_nick')
        .setLabel(`${EMOJIS.CROWN} Ваш игровой никнейм`)
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('Ваш ник, который будет вписан в состав')
        .setRequired(true);
    if (data.leader_nick) nickInput.setValue(data.leader_nick);
    
    // --- SteamID64 главы ---
    const steamInput = new TextInputBuilder()
        .setCustomId('leader_steamid')
        .setLabel(`${EMOJIS.ROCKET} Ваш SteamID64`)
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('Например: 76561198000000001')
        .setMinLength(17)
        .setMaxLength(17)
        .setRequired(true);
    if (data.leader_steamid) steamInput.setValue(data.leader_steamid);

    modal.addComponents(
        new ActionRowBuilder().addComponents(nickInput),
        new ActionRowBuilder().addComponents(steamInput)
    );
        
    return modal;
}

/**
 * ШАГ 3: СОСТАВ КЛАНА
 * @param {object} [data={}] - Существующие данные сессии для предзаполнения.
 */
function createRosterModal(data = {}) {
    const modal = new ModalBuilder()
        .setCustomId('clan_create_step3_modal')
        .setTitle('Шаг 3/3: Состав клана');
        
    // --- Состав клана ---
    const rosterInput = new TextInputBuilder()
        .setCustomId('clan_roster')
        .setLabel(`${EMOJIS.USERS} Список участников (каждый с новой строки)`)
        .setStyle(TextInputStyle.Paragraph)
        .setPlaceholder('Никнейм, SteamID, DiscordID')
        .setRequired(true);
    if (data.roster) rosterInput.setValue(data.roster);
    
    modal.addComponents(
        new ActionRowBuilder().addComponents(rosterInput)
    );

    return modal;
}

module.exports = {
    createBasicInfoModal,
    createLeaderInfoModal,
    createRosterModal,
};