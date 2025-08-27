const fs = require('fs').promises;
const path = require('path');

const logDirectory = path.join(__dirname, '..', '..', 'logs');
const LOG_RETENTION_DAYS = 14; // Храним логи 2 недели

if (!require('fs').existsSync(logDirectory)) {
    require('fs').mkdirSync(logDirectory);
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

    require('fs').appendFile(getLogfileName(), fileMessage, (err) => {
        if (err) {
            console.error(`${colors.fg.red}CRITICAL: Failed to write to log file.${colors.reset}`, err);
        }
    });
};

const logger = {
    info: (message) => log('INFO', message),
    warn: (message) => log('WARN', message),
    error: (message, error) => {
        if (error) {
            const errorMessage = `${message}\n${error.stack || error}`;
            log('ERROR', errorMessage);
        } else {
            log('ERROR', message);
        }
    },
    debug: (message) => log('DEBUG', message),
};

/**
 * Функция для очистки старых лог-файлов.
 */
async function cleanupOldLogs() {
    logger.info('Запущена проверка и очистка старых логов...');
    try {
        const files = await fs.readdir(logDirectory);
        const currentDate = new Date();

        for (const file of files) {
            const match = file.match(/^bot-(\d{4}-\d{2}-\d{2})\.log$/);
            if (!match) continue;

            const filePath = path.join(logDirectory, file);
            const logDate = new Date(match[1]);
            
            const diffTime = currentDate - logDate;
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

            if (diffDays > LOG_RETENTION_DAYS) {
                try {
                    await fs.unlink(filePath);
                    logger.warn(`Удален старый лог-файл: ${file} (возраст: ${diffDays} дней)`);
                } catch (unlinkErr) {
                    logger.error(`Не удалось удалить лог-файл ${file}:`, unlinkErr);
                }
            }
        }
        logger.info('Очистка старых логов завершена.');
    } catch (err) {
        logger.error('Произошла ошибка во время очистки логов:', err);
    }
}

logger.cleanupOldLogs = cleanupOldLogs;

module.exports = logger;