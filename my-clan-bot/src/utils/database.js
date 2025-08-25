const { MongoClient } = require('mongodb');
require('dotenv').config();

const uri = process.env.MONGO_URI;
const dbName = process.env.DB_NAME;

if (!uri || !dbName) {
    console.error('🔥 КРИТИЧЕСКАЯ ОШИБКА: Переменные MONGO_URI и/или DB_NAME должны быть установлены в файле .env');
    process.exit(1);
}

const client = new MongoClient(uri);

let db;
let draftsCollection;
let clansCollection;

async function connectToDb() {
    try {
        await client.connect();
        console.log(`💾 Успешное подключение к MongoDB! База данных: "${dbName}"`);
        
        db = client.db(dbName);
        draftsCollection = db.collection('clan_drafts'); // Коллекция для временных заявок
        clansCollection = db.collection('clans');       // Коллекция для созданных кланов
        
    } catch (error) {
        console.error('🔥 Не удалось подключиться к MongoDB.', error);
        process.exit(1);
    }
}

module.exports = { 
    connectToDb,
    getDraftsCollection: () => draftsCollection,
    getClansCollection: () => clansCollection
};