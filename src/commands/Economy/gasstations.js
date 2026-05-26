import { SlashCommandBuilder } from 'discord.js';
import { errorEmbed, successEmbed, infoEmbed } from '../../utils/embeds.js';
import { getEconomyData, setEconomyData } from '../../utils/economy.js';
import { withErrorHandling } from '../../utils/errorHandler.js';
import { InteractionHelper } from '../../utils/interactionHelper.js';
import {
    GAS_STATIONS,
    REFUEL_COST,
    TANK_CAPACITY,
    getFuel,
    fuelGauge,
    refuelTank,
} from '../../utils/fuel.js';

export default {
    data: new SlashCommandBuilder()
        .setName('gasstations')
        .setDescription('Gas stations across Los Santos — refuel, check fuel, or browse locations')
        .addSubcommand(s => s
            .setName('list')
            .setDescription('See every gas station in Los Santos / Blaine County'))
        .addSubcommand(s => s
            .setName('refuel')
            .setDescription(`Fill up your tank ($${REFUEL_COST.toLocaleString()} flat)`))
        .addSubcommand(s => s
            .setName('check')
            .setDescription('Check how much fuel you have left')),

    execute: withErrorHandling(async (interaction, config, client) => {
        await InteractionHelper.safeDefer(interaction);

        const sub = interaction.options.getSubcommand();
        const userId = interaction.user.id;
        const guildId = interaction.guildId;
        const userData = await getEconomyData(client, guildId, userId);

        if (sub === 'list') {
            const lines = GAS_STATIONS
                .map(g => `• **${g.name}** — _${g.area}_`)
                .join('\n');
            const body =
                `${lines}\n\n` +
                `Every station charges a flat **$${REFUEL_COST.toLocaleString()}** for a full tank ` +
                `(${TANK_CAPACITY} units). Use \`/gasstations refuel\` to fill up.`;
            return await InteractionHelper.safeEditReply(interaction, {
                embeds: [infoEmbed('⛽ Gas Stations — Los Santos & Blaine County', body)],
            });
        }

        if (sub === 'check') {
            const fuel = getFuel(userData);
            const body =
                `${fuelGauge(fuel)}\n\n` +
                (fuel === 0
                    ? '🚨 Tank is **empty**. Car-related commands are blocked until you `/gasstations refuel`.'
                    : fuel <= 2
                        ? '⚠️ Running low. Better hit a pump soon.'
                        : '✅ You\'re good to roll.');
            return await InteractionHelper.safeEditReply(interaction, {
                embeds: [infoEmbed('⛽ Fuel Status', body)],
            });
        }

        if (sub === 'refuel') {
            // refuelTank() throws on full tank or insufficient funds — handled by withErrorHandling.
            const { previous, filled, cost } = refuelTank(userData);
            await setEconomyData(client, guildId, userId, userData);

            const body =
                `Filled **${filled}** unit${filled === 1 ? '' : 's'} ` +
                `(from ${previous}/${TANK_CAPACITY} → ${TANK_CAPACITY}/${TANK_CAPACITY}).\n` +
                `Paid **$${cost.toLocaleString()}**. Wallet now: **$${(userData.wallet || 0).toLocaleString()}**.\n\n` +
                `${fuelGauge(TANK_CAPACITY)}`;
            return await InteractionHelper.safeEditReply(interaction, {
                embeds: [successEmbed('⛽ Tank Full', body)],
            });
        }
    }, { command: 'gasstations' }),
};
