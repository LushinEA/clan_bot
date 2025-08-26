const { EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, StringSelectMenuOptionBuilder } = require('discord.js');
const { COLORS, EMOJIS } = require('../../config');

/**
 * @param {Array<object>} clans - Массив объектов кланов из БД.
 */
function createInsigniaEmbed(clans) {
    const embed = new EmbedBuilder()
        .setTitle(`${EMOJIS.SHIELD} КЛАНОВЫЕ НАШИВКИ`)
        .setColor(COLORS.PRIMARY)
        .setDescription(
            `Добро пожаловать в систему получения клановых нашивок!\n\n` +
            `Здесь вы можете присоединиться к существующему клану, если являетесь его участником. ` +
            `Выберите свой клан из выпадающего списка ниже, чтобы получить соответствующую роль.`
        )
        .addFields({
            name: '⚠️ Важно',
            value: '> • Вы можете состоять только в одном клане.\n' +
                   '> • После выбора клана вам потребуется указать ваш **игровой никнейм** и **SteamID64**.'
        })
        .setFooter({ text: 'Выберите ваш клан из списка' });

    const selectMenu = new StringSelectMenuBuilder()
        .setCustomId('insignia_clan_select')
        .setPlaceholder('Выберите клан для вступления...')
        .addOptions(
            clans.slice(0, 25).map(clan =>
                new StringSelectMenuOptionBuilder()
                    .setLabel(`${clan.tag} | ${clan.name}`)
                    .setDescription(`Глава: ${clan.creatorTag}`)
                    .setValue(clan.roleId)
            )
        );

    const row = new ActionRowBuilder().addComponents(selectMenu);

    return {
        embeds: [embed],
        components: [row]
    };
}

module.exports = {
    createInsigniaEmbed,
};