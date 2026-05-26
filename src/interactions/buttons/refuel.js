import { ButtonBuilder, ButtonStyle, ActionRowBuilder } from 'discord.js';
import { successEmbed, errorEmbed } from '../../utils/embeds.js';
import { getEconomyData, setEconomyData } from '../../utils/economy.js';
import { InteractionHelper } from '../../utils/interactionHelper.js';
import { refuelTank, TANK_CAPACITY, REFUEL_COST, fuelGauge } from '../../utils/fuel.js';
import { logger } from '../../utils/logger.js';

// Custom ID used by the refuel button. Use a colon so the dispatcher in
// events/interactionCreate.js routes it via client.buttons.get('refuel_btn').
export const REFUEL_BUTTON_ID = 'refuel_btn';

/**
 * Build an action row with a single "⛽ Refuel ($500)" button.
 * Call this from any command that wants to offer a one-click refuel.
 */
export function buildRefuelRow() {
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(`${REFUEL_BUTTON_ID}:go`)
            .setLabel(`⛽ Refuel ($${REFUEL_COST.toLocaleString()})`)
            .setStyle(ButtonStyle.Success),
    );
}

export default {
    name: REFUEL_BUTTON_ID,
    async execute(interaction, client /*, args */) {
        try {
            // Make sure only the user who triggered the original message can refuel
            // their own tank (otherwise anyone in the channel could spam-charge them).
            const originalUserId = interaction.message?.interaction?.user?.id;
            if (originalUserId && originalUserId !== interaction.user.id) {
                return await interaction.reply({
                    embeds: [errorEmbed(
                        '⛔ Not your pump',
                        'Only the player who ran the original command can use this refuel button. Run `/gasstations refuel` yourself.',
                    )],
                    ephemeral: true,
                });
            }

            await InteractionHelper.safeDefer(interaction, { ephemeral: true });

            const userId = interaction.user.id;
            const guildId = interaction.guildId;
            const userData = await getEconomyData(client, guildId, userId);

            // refuelTank throws on broke / already-full — convert to a friendly ephemeral reply.
            let result;
            try {
                result = refuelTank(userData);
            } catch (err) {
                return await InteractionHelper.safeEditReply(interaction, {
                    embeds: [errorEmbed('⛽ Refuel failed', err.userMessage || err.message)],
                });
            }

            await setEconomyData(client, guildId, userId, userData);

            const body =
                `Filled **${result.filled}** unit${result.filled === 1 ? '' : 's'} ` +
                `(from ${result.previous}/${TANK_CAPACITY} → ${TANK_CAPACITY}/${TANK_CAPACITY}).\n` +
                `Paid **$${result.cost.toLocaleString()}**. Wallet now: **$${(userData.wallet || 0).toLocaleString()}**.\n\n` +
                `${fuelGauge(TANK_CAPACITY)}`;

            await InteractionHelper.safeEditReply(interaction, {
                embeds: [successEmbed('⛽ Tank Full', body)],
            });
        } catch (error) {
            logger.error('refuel button handler error:', error);
            try {
                await InteractionHelper.safeEditReply(interaction, {
                    embeds: [errorEmbed('⛽ Refuel failed', 'Something went wrong at the pump. Try `/gasstations refuel`.')],
                });
            } catch (_) { /* swallow */ }
        }
    },
};
