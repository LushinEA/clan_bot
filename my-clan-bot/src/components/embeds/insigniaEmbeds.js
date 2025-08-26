const { EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
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
                   '> • После выбора клана вам потребуется указать ваш **игровой никнейм** и **SteamID64**.\n' +
                   '> • Если вы хотите покинуть клан, используйте красную кнопку ниже.'
        })
        .setFooter({ text: 'Выберите ваш клан из списка или используйте кнопки' });

    // --- Выпадающий список ---
    const selectMenu = new StringSelectMenuBuilder()
        .setCustomId('insignia_clan_select')
        .setPlaceholder('Выберите клан для вступления...')
        .addOptions(
            new StringSelectMenuOptionBuilder()
                .setLabel('Сбросить выбор')
                .setDescription('Нажмите, чтобы очистить текущий выбор.')
                .setValue('insignia_reset_selection'),
            ...clans.slice(0, 24).map(clan =>
                new StringSelectMenuOptionBuilder()
                    .setLabel(`${clan.tag} | ${clan.name}`)
                    .setDescription(`Глава: ${clan.creatorTag}`)
                    .setValue(clan.roleId)
            )
        );

    const selectRow = new ActionRowBuilder().addComponents(selectMenu);

    // --- Кнопки ---
    const buttonRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('insignia_leave_clan')
            .setLabel('Покинуть клан')
            .setStyle(ButtonStyle.Danger)
    );


    return {
        embeds: [embed],
        components: [selectRow, buttonRow]
    };
}

module.exports = {
    createInsigniaEmbed,
};