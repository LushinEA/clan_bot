const { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } = require('discord.js');
const { EMOJIS } = require('../../config');

/**
 * Модальное окно для редактирования основной информации о клане.
 * @param {object} clanData - Данные клана из БД для предзаполнения.
 */
function createEditInfoModal(clanData) {
    const modal = new ModalBuilder()
        .setCustomId('clan_manage_edit_info_modal')
        .setTitle('Управление кланом: Инфо');

    const tagInput = new TextInputBuilder()
        .setCustomId('clan_tag')
        .setLabel(`${EMOJIS.SWORD} Клан-тег`)
        .setStyle(TextInputStyle.Short)
        .setMinLength(2)
        .setMaxLength(7)
        .setValue(clanData.tag)
        .setRequired(true);

    const nameInput = new TextInputBuilder()
        .setCustomId('clan_name')
        .setLabel(`${EMOJIS.SHIELD} Полное название клана`)
        .setStyle(TextInputStyle.Short)
        .setValue(clanData.name)
        .setRequired(true);

    const colorInput = new TextInputBuilder()
        .setCustomId('clan_color')
        .setLabel(`${EMOJIS.SPARKLES} Цвет роли (HEX без #)`)
        .setStyle(TextInputStyle.Short)
        .setMinLength(6)
        .setMaxLength(6)
        .setValue(clanData.color.replace('#', ''))
        .setRequired(true);
        
    const serverInput = new TextInputBuilder()
        .setCustomId('clan_server')
        .setLabel('Сервер (1=Скучная, 2=Inv, 3=RAAS, 4=GE)')
        .setStyle(TextInputStyle.Short)
        .setValue(clanData.server)
        .setMinLength(1)
        .setMaxLength(1)
        .setRequired(true);

    modal.addComponents(
        new ActionRowBuilder().addComponents(tagInput),
        new ActionRowBuilder().addComponents(nameInput),
        new ActionRowBuilder().addComponents(colorInput),
        new ActionRowBuilder().addComponents(serverInput)
    );

    return modal;
}


/**
 * Модальное окно для редактирования состава клана.
 * @param {object} clanData - Данные клана из БД для предзаполнения.
 */
function createEditRosterModal(clanData) {
    const modal = new ModalBuilder()
        .setCustomId('clan_manage_edit_roster_modal')
        .setTitle('Управление кланом: Состав');
        
    const rosterInput = new TextInputBuilder()
        .setCustomId('clan_roster')
        .setLabel('Список участников') 
        .setStyle(TextInputStyle.Paragraph)
        .setPlaceholder('Каждый участник с новой строки в формате:\nНикнейм, SteamID64, DiscordID')
        .setValue(clanData.roster || '')
        .setRequired(false);
    
    modal.addComponents(
        new ActionRowBuilder().addComponents(rosterInput)
    );

    return modal;
}

module.exports = {
    createEditInfoModal,
    createEditRosterModal
};