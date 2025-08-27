const fs = require('fs');
const path = require('path');

const logDirectory = path.join(__dirname, '..', '..', 'logs');

if (!fs.existsSync(logDirectory)) {
    fs.mkdirSync(logDirectory);
}

// ANSI escape-коды для цветов в консоли
const colors = {
    reset: "\x1b[0m",
    dim: "\x1b[2m",
    fg: {
        red: "\x1b[31m",
        yellow: "\x1b[33m",
        cyan: "\x1b[36m",
        gray: "\x1b[90m"
    }
};

/**
 * Получаем текущую дату в формате YYYY-MM-DD для имени файла.
 * @returns {string}
 */
const getLogfileName = () => {
    const date = new Date();
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return path.join(logDirectory, `bot-${year}-${month}-${day}.log`);
};

/**
 * Основная функция логирования.
 * @param {string} level - Уровень лога (INFO, WARN, ERROR, DEBUG).
 * @param {string} message - Сообщение для логирования.
 */
const log = (level, message) => {
    const timestamp = new Date().toISOString();
    const levelUpper = level.toUpperCase();

    // --- Лог для файла (чистый текст) ---
    const fileMessage = `[${timestamp}] [${levelUpper}] ${message}\n`;

    // --- Лог для консоли (с цветами) ---
    let levelColor = colors.reset;
    switch (level) {
        case 'INFO':
            levelColor = colors.fg.cyan;
            break;
        case 'WARN':
            levelColor = colors.fg.yellow;
            break;
        case 'ERROR':
            levelColor = colors.fg.red;
            break;
        case 'DEBUG':
            levelColor = colors.fg.gray;
            break;
    }
    const consoleMessage = `${colors.dim}[${timestamp}]${colors.reset} ${levelColor}[${levelUpper.padEnd(5)}]${colors.reset} ${message}`;

    // Вывод в консоль
    if (level === 'ERROR') {
        console.error(consoleMessage);
    } else {
        console.log(consoleMessage);
    }

    // Запись в файл
    fs.appendFile(getLogfileName(), fileMessage, (err) => {
        if (err) {
            // Используем красный цвет для критической ошибки записи в лог
            console.error(`${colors.fg.red}CRITICAL: Failed to write to log file.${colors.reset}`, err);
        }
    });
};

const logger = {
    /** Логирование информационных сообщений (голубой) */
    info: (message) => log('INFO', message),
    /** Логирование предупреждений (желтый) */
    warn: (message) => log('WARN', message),
    /** Логирование ошибок (красный) */
    error: (message, error) => {
        if (error) {
            const errorMessage = `${message}\n${error.stack || error}`;
            log('ERROR', errorMessage);
        } else {
            log('ERROR', message);
        }
    },
    /** Логирование отладочной информации (серый) */
    debug: (message) => log('DEBUG', message),
};

module.exports = logger;