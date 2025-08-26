/**
 * Порог схожести цветов. Чем меньше значение, тем более похожими должны быть цвета,
 * чтобы считаться дубликатами. Значение подобрано экспериментально.
 * (Евклидово расстояние в пространстве RGB. Максимум ~441)
 */
const COLOR_SIMILARITY_THRESHOLD = 50;

/**
 * Конвертирует HEX-строку в объект RGB.
 * @param {string} hex - HEX-строка (например, '#FF5733').
 * @returns {{r: number, g: number, b: number}|null}
 */
function hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
    } : null;
}

/**
 * Вычисляет евклидово расстояние между двумя цветами в пространстве RGB.
 * @param {{r: number, g: number, b: number}} rgb1
 * @param {{r: number, g: number, b: number}} rgb2
 * @returns {number}
 */
function getColorDistance(rgb1, rgb2) {
    const rDiff = rgb1.r - rgb2.r;
    const gDiff = rgb1.g - rgb2.g;
    const bDiff = rgb1.b - rgb2.b;
    return Math.sqrt(rDiff * rDiff + gDiff * gDiff + bDiff * bDiff);
}

/**
 * Проверяет, является ли новый цвет слишком похожим на один из существующих.
 * @param {string} newColorHex - Новый цвет для проверки.
 * @param {string[]} existingColorsHex - Массив существующих цветов.
 * @returns {boolean} - true, если цвет слишком похож.
 */
function isColorTooSimilar(newColorHex, existingColorsHex) {
    const newRgb = hexToRgb(newColorHex);
    if (!newRgb) return false; // Невалидный новый цвет

    for (const existingHex of existingColorsHex) {
        const existingRgb = hexToRgb(existingHex);
        if (existingRgb) {
            const distance = getColorDistance(newRgb, existingRgb);
            if (distance < COLOR_SIMILARITY_THRESHOLD) {
                return true; // Найден слишком похожий цвет
            }
        }
    }

    return false;
}

module.exports = {
    isColorTooSimilar
};