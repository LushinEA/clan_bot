const { Events } = require('discord.js');
const clanCreationManager = require('../../features/clanCreationManager');
const { handleInteractionError } = require('../../utils/errorHandler');

module.exports = {
    name: Events.InteractionCreate,
    async execute(interaction, client) {
        try {
            if (!interaction.inGuild()) return;

            // --- Обработка кнопок ---
            if (interaction.isButton()) {
                if (interaction.customId.startsWith('clan_create_')) {
                    await clanCreationManager.handleButton(interaction);
                }
            }

            // --- Обработка модальных окон ---
            if (interaction.isModalSubmit()) {
                if (interaction.customId.startsWith('clan_create_')) {
                    await clanCreationManager.handleModalSubmit(interaction);
                }
            }
            
            // --- Обработка слеш-команд (когда они появятся) ---
        } catch (error) {
            await handleInteractionError(error, interaction, 'interactionCreate');
        }
    },
};