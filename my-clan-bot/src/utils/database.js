const { MongoClient } = require('mongodb');
const logger = require('./logger');
require('dotenv').config();

const uri = process.env.MONGO_URI;
const dbName = process.env.DB_NAME;

if (!uri || !dbName) {
    logger.error('КРИТИЧЕСКАЯ ОШИБКА: Переменные MONGO_URI и/или DB_NAME должны быть установлены в файле .env');
    process.exit(1);
}

const client = new MongoClient(uri);

let db;
let clansCollection;

async function connectToDb() {
    try {
        await client.connect();
        logger.info(`Успешное подключение к MongoDB! База данных: "${dbName}"`);
        
        db = client.db(dbName);
        clansCollection = db.collection('clans'); // Коллекция для созданных кланов
        
    } catch (error) {
        logger.error('Не удалось подключиться к MongoDB.', error);
        process.exit(1);
    }
}

module.exports = { 
    connectToDb,
    getClansCollection: () => clansCollection
};