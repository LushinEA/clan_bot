const logger = require('./logger');
const CLAN_TAG_REGEX = /^\S+\s+/;
const NICKNAME_MAX_LENGTH = 32;

/**
 * Безопасно устанавливает никнейм для участника, обрабатывая ошибки прав и владельца сервера.
 * @param {import('discord.js').GuildMember} member - Объект участника сервера.
 * @param {string|null} newNickname - Новый никнейм. null для сброса.
 * @param {string} reason - Причина изменения для логов аудита.
 */
async function setNickname(member, newNickname, reason) {
    if (member.id === member.guild.ownerId) {
        logger.warn(`[Nickname] Невозможно изменить никнейм владельца сервера: ${member.user.tag}`);
        return;
    }

    try {
        await member.setNickname(newNickname, reason);
        const finalNick = newNickname || member.user.username;
        logger.info(`[Nickname] Установлен никнейм для ${member.user.tag}: "${finalNick}"`);
    } catch (error) {
        if (error.code === 50013) {
            logger.error(`[Nickname] НЕ УДАЛОСЬ установить никнейм для ${member.user.tag}. Причина: Отсутствует право 'Manage Nicknames' или роль бота ниже роли участника.`);
        } else {
            logger.error(`[Nickname] НЕ УДАЛОСЬ установить никнейм для ${member.user.tag}:`, error);
        }
    }
}

/**
 * Добавляет клантег к никнейму участника.
 * Автоматически удаляет старый тег, если он есть.
 * @param {import('discord.js').GuildMember} member - Объект участника сервера.
 * @param {string} clanTag - "Чистый" тег клана, как он был введен.
 */
async function addClanTag(member, clanTag) {
    if (!member || !clanTag) return;

    const currentNick = member.displayName;
    const cleanNick = currentNick.replace(CLAN_TAG_REGEX, '');

    let newNick = `${clanTag} ${cleanNick}`;

    if (newNick.length > NICKNAME_MAX_LENGTH) {
        const overflow = newNick.length - NICKNAME_MAX_LENGTH;
        const truncatedCleanNick = cleanNick.slice(0, cleanNick.length - overflow);
        newNick = `${clanTag} ${truncatedCleanNick}`.trim();
        logger.warn(`[Nickname] Никнейм для ${member.user.tag} был урезан до 32 символов.`);
    }

    await setNickname(member, newNick, `Добавлен клантег "${clanTag}"`);
}

/**
 * Удаляет клантег из никнейма участника.
 * @param {import('discord.js').GuildMember} member - Объект участника сервера.
 */
async function removeClanTag(member) {
    if (!member) return;

    const currentNick = member.nickname; 
    
    if (!currentNick || !CLAN_TAG_REGEX.test(currentNick)) {
        return;
    }
    
    const newNick = currentNick.replace(CLAN_TAG_REGEX, '').trim();

    await setNickname(member, newNick.length > 0 ? newNick : null, 'Удален клантег');
}

module.exports = {
    addClanTag,
    removeClanTag,
};