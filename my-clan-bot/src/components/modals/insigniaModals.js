const { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } = require('discord.js');
const { EMOJIS } = require('../../config');

/**
 * @param {string} clanRoleId - ID роли клана, чтобы сделать CustomID уникальным.
 */
function createInsigniaModal(clanRoleId) {
    const modal = new ModalBuilder()
        .setCustomId(`insignia_join_modal_${clanRoleId}`)
        .setTitle('Вступление в клан');

    const nickInput = new TextInputBuilder()
        .setCustomId('insignia_nick')
        .setLabel(`${EMOJIS.PENCIL} Ваш игровой никнейм`)
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('Никнейм, под которым вы играете')
        .setRequired(true);
        
    const steamInput = new TextInputBuilder()
        .setCustomId('insignia_steamid')
        .setLabel(`${EMOJIS.ROCKET} Ваш SteamID64 (17 цифр)`)
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('Например: 76561198000000001')
        .setMinLength(17)
        .setMaxLength(17)
        .setRequired(true);

    modal.addComponents(
        new ActionRowBuilder().addComponents(nickInput),
        new ActionRowBuilder().addComponents(steamInput)
    );

    return modal;
}

module.exports = {
    createInsigniaModal,
};