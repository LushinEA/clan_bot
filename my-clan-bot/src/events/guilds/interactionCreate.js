const { Events } = require('discord.js');
const clanCreationManager = require('../../features/clanCreationManager');
const insigniaManager = require('../../features/insigniaManager');
const clanManagementManager = require('../../features/clanManagementManager');
const { handleInteractionError } = require('../../utils/errorHandler');
const logger = require('../../utils/logger');

module.exports = {
    name: Events.InteractionCreate,
    async execute(interaction, client) {
        try {
            if (!interaction.inGuild()) return;
            
            // Логирование всех взаимодействий для аудита
            const user = interaction.user;
            let details = `User: ${user.tag} (${user.id})`;
            if (interaction.isCommand()) details += `, Command: /${interaction.commandName}`;
            if (interaction.isButton() || interaction.isStringSelectMenu() || interaction.isModalSubmit()) details += `, CustomID: ${interaction.customId}`;
            logger.info(`[Interaction] ${details}`);


            // --- Обработка кнопок ---
            if (interaction.isButton()) {
                if (interaction.customId.startsWith('clan_create_')) {
                    await clanCreationManager.handleButton(interaction);
                } else if (interaction.customId.startsWith('clan_manage_')) {
                    await clanManagementManager.handleButton(interaction);
                } else if (interaction.customId === 'insignia_leave_clan') {
                    await insigniaManager.handleLeave(interaction);
                }
            }

            // --- Обработка выпадающих списков (Select Menu) ---
            if (interaction.isStringSelectMenu()) {
                if (interaction.customId === 'insignia_clan_select') {
                    await insigniaManager.handleSelect(interaction);
                }
            }

            // --- Обработка модальных окон ---
            if (interaction.isModalSubmit()) {
                if (interaction.customId.startsWith('clan_create_')) {
                    await clanCreationManager.handleModalSubmit(interaction);
                } else if (interaction.customId.startsWith('clan_manage_')) {
                    await clanManagementManager.handleModalSubmit(interaction);
                } else if (interaction.customId.startsWith('insignia_join_modal_')) {
                    await insigniaManager.handleModal(interaction);
                }
            }
            // --- Обработка слеш-команд (когда они появятся) ---
        } catch (error) {
            await handleInteractionError(error, interaction, 'interactionCreate');
        }
    },
};