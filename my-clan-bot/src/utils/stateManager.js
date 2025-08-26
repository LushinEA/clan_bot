const fs = require('fs').promises;
const path = require('path');

// Указываем путь к файлу, где будет храниться состояние
const stateFilePath = path.join(__dirname, '..', 'data', 'bot_state.json');

/**
 * Читаем текущее состояние из файла.
 * Если файл не существует, возвращаем пустой объект.
 * @returns {Promise<object>}
 */
async function getState() {
    try {
        await fs.mkdir(path.dirname(stateFilePath), { recursive: true });
        const data = await fs.readFile(stateFilePath, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        // Если файл не найден, это нормальная ситуация при первом запуске
        if (error.code === 'ENOENT') {
            return {}; // Возвращаем пустой объект
        }
        console.error("Ошибка при чтении файла состояния:", error);
        return {};
    }
}

/**
 * Сохраняем новое состояние в файл.
 * @param {object} state - Объект состояния для сохранения.
 */
async function saveState(state) {
    try {
        await fs.mkdir(path.dirname(stateFilePath), { recursive: true });
        await fs.writeFile(stateFilePath, JSON.stringify(state, null, 2), 'utf8');
    } catch (error) {
        console.error("Ошибка при сохранении файла состояния:", error);
    }
}

/**
 * Обновляем конкретное значение в файле состояния.
 * @param {string} key - Ключ для обновления.
 * @param {*} value - Новое значение.
 */
async function updateState(key, value) {
    const currentState = await getState();
    currentState[key] = value;
    await saveState(currentState);
}

module.exports = {
    getState,
    updateState,
};