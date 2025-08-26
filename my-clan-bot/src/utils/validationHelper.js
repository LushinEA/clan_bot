const { getClansCollection } = require('./database');
const { isColorTooSimilar } = require('./colorUtils');

/**
 * Проверяем, состоит ли пользователь уже в каком-либо клане по Discord ID или SteamID.
 * @param {object} ids - Объект с идентификаторами { discordId?: string, steamId?: string }.
 * @returns {Promise<object|null>} - Возвращает объект клана, если пользователь найден, иначе null.
 */
async function findUserClan({ discordId, steamId }) {
    const clansCollection = getClansCollection();
    
    const queryConditions = [];

    if (discordId) {
        queryConditions.push({ creatorId: discordId });
        queryConditions.push({ leader_discordid: discordId });
        queryConditions.push({ roster: new RegExp(`\\b${discordId}\\b`) });
    }
    
    if (steamId) {
        queryConditions.push({ leader_steamid: steamId });
        queryConditions.push({ roster: new RegExp(`\\b${steamId}\\b`) });
    }

    // Если нет идентификаторов для поиска, выходим
    if (queryConditions.length === 0) {
        return null;
    }

    const userClan = await clansCollection.findOne({ $or: queryConditions });
    return userClan;
}

/**
 * Проверяем уникальность данных клана (тег, название, цвет).
 * @param {object} data - Данные для проверки { tag, name, color }.
 * @param {import('mongodb').ObjectId|null} clanIdToExclude - ID клана, который нужно исключить из проверки (при редактировании).
 * @returns {Promise<{isValid: boolean, message: string}>}
 */
async function validateUniqueness(data, clanIdToExclude = null) {
    const clansCollection = getClansCollection();
    const { tag, name, color } = data;

    // 1. Проверка тега и названия
    const query = {
        $or: [
            { tag: { $regex: `^${tag}$`, $options: 'i' } },
            { name: { $regex: `^${name}$`, $options: 'i' } }
        ]
    };

    if (clanIdToExclude) {
        query._id = { $ne: clanIdToExclude };
    }

    const existingClan = await clansCollection.findOne(query);

    if (existingClan) {
        if (existingClan.tag.toLowerCase() === tag.toLowerCase()) {
            return { isValid: false, message: `❌ **Ошибка!** Клан-тег \`${tag}\` уже занят.` };
        }
        if (existingClan.name.toLowerCase() === name.toLowerCase()) {
            return { isValid: false, message: `❌ **Ошибка!** Название клана "${name}" уже занято.` };
        }
    }
    
    // 2. Проверка цвета
    const colorFilter = clanIdToExclude ? { _id: { $ne: clanIdToExclude } } : {};
    const otherClans = await clansCollection.find(colorFilter).project({ color: 1, _id: 0 }).toArray();
    const existingColors = otherClans.map(c => c.color);

    if (isColorTooSimilar(color, existingColors)) {
        return { isValid: false, message: `❌ **Ошибка!** Выбранный цвет \`${color}\` слишком похож на цвет другого клана. Попробуйте другой оттенок.` };
    }
    
    return { isValid: true, message: 'Проверка пройдена.' };
}

/**
 * Проверяем участников из списка на членство в других кланах.
 * @param {string} rosterString - Строка с составом клана.
 * @param {import('mongodb').ObjectId|null} clanIdToExclude - ID клана, который нужно исключить из проверки (при редактировании).
 * @returns {Promise<{isValid: boolean, message: string}>}
 */
async function validateRosterMembers(rosterString, clanIdToExclude = null) {
    const lines = rosterString.split('\n').filter(line => line.trim() !== '');
    
    for (const line of lines) {
        const parts = line.split(',').map(p => p.trim());
        if (parts.length < 3) continue;

        const [, steamId, discordId] = parts;
        if (!/^\d{17,19}$/.test(discordId) || !/^\d{17}$/.test(steamId)) continue;
        
        const memberClan = await findUserClan({ discordId, steamId });
        
        if (memberClan && (!clanIdToExclude || memberClan._id.toString() !== clanIdToExclude.toString())) {
             return { 
                isValid: false, 
                message: `❌ **Ошибка!** Участник <@${discordId}> (или пользователь со SteamID \`${steamId}\`) уже состоит в клане **\`${memberClan.tag}\` ${memberClan.name}**. Он должен сначала покинуть свой текущий клан.` 
            };
        }
    }

    return { isValid: true, message: 'Все участники свободны.' };
}


module.exports = {
    findUserClan,
    validateUniqueness,
    validateRosterMembers
};