import { SlashCommandBuilder } from 'discord.js';
import { errorEmbed, successEmbed, warningEmbed } from '../../utils/embeds.js';
import { getEconomyData, setEconomyData } from '../../utils/economy.js';
import { withErrorHandling, createError, ErrorTypes } from '../../utils/errorHandler.js';
import { InteractionHelper } from '../../utils/interactionHelper.js';
import { getFuel, fuelGauge, TANK_CAPACITY } from '../../utils/fuel.js';

const SIPHON_COOLDOWN = 90 * 60 * 1000;       // 90 min between attempts
const SUCCESS_CHANCE = 0.55;                   // base success rate
const JAIL_TIME = 45 * 60 * 1000;              // 45 min for a busted siphon
const FINE = 750;                              // fine on a bust
const MAX_STEAL_UNITS = 3;                     // most you can pull in one go

export default {
    data: new SlashCommandBuilder()
        .setName('siphon')
        .setDescription("Siphon fuel from another player's tank (risky — can get you jailed)")
        .addUserOption(o => o
            .setName('user')
            .setDescription('Whose tank are you draining?')
            .setRequired(true)),

    execute: withErrorHandling(async (interaction, config, client) => {
        await InteractionHelper.safeDefer(interaction);

        const thief = interaction.user;
        const victim = interaction.options.getUser('user');
        const guildId = interaction.guildId;
        const now = Date.now();

        if (victim.id === thief.id) {
            throw createError('Self siphon',
                ErrorTypes.VALIDATION,
                "You can't siphon your own tank, genius.");
        }
        if (victim.bot) {
            throw createError('Bot siphon',
                ErrorTypes.VALIDATION,
                "Bots don't drive. Pick a real player.");
        }

        const thiefData = await getEconomyData(client, guildId, thief.id);
        const victimData = await getEconomyData(client, guildId, victim.id);

        // Jail check
        if (thiefData.jailedUntil && thiefData.jailedUntil > now) {
            const m = Math.ceil((thiefData.jailedUntil - now) / 60000);
            throw createError('Jailed',
                ErrorTypes.RATE_LIMIT,
                `You're locked up for ${m} more minutes.`);
        }

        // Cooldown
        const last = thiefData.cooldowns?.siphon || 0;
        if (now < last + SIPHON_COOLDOWN) {
            const m = Math.ceil((last + SIPHON_COOLDOWN - now) / 60000);
            throw createError('Cooldown',
                ErrorTypes.RATE_LIMIT,
                `Cool it. Try again in ${m} minutes.`);
        }

        // Victim has to actually have gas worth stealing.
        const victimFuel = getFuel(victimData);
        if (victimFuel < 1) {
            throw createError('Empty target',
                ErrorTypes.VALIDATION,
                `**${victim.username}**'s tank is already empty. Nothing to siphon.`);
        }

        // And the thief needs tank room.
        const thiefFuel = getFuel(thiefData);
        if (thiefFuel >= TANK_CAPACITY) {
            throw createError('Tank full',
                ErrorTypes.VALIDATION,
                `Your own tank is already full (${TANK_CAPACITY}/${TANK_CAPACITY}). Nowhere to put more gas.`);
        }

        thiefData.cooldowns = thiefData.cooldowns || {};
        thiefData.cooldowns.siphon = now;

        const success = Math.random() < SUCCESS_CHANCE;

        if (success) {
            // Transfer up to MAX_STEAL_UNITS, bounded by victim's fuel and thief's free space.
            const room = TANK_CAPACITY - thiefFuel;
            const stolen = Math.min(MAX_STEAL_UNITS, victimFuel, room);

            victimData.fuel = victimFuel - stolen;
            thiefData.fuel = thiefFuel + stolen;

            await setEconomyData(client, guildId, thief.id, thiefData);
            await setEconomyData(client, guildId, victim.id, victimData);

            return await InteractionHelper.safeEditReply(interaction, {
                embeds: [successEmbed(
                    '🛢️ Siphon Successful',
                    `You drained **${stolen}** unit${stolen === 1 ? '' : 's'} of fuel from ` +
                    `**${victim.username}**'s tank without getting spotted.\n\n` +
                    `⛽ Your tank: ${fuelGauge(thiefData.fuel)}\n` +
                    `🪣 Theirs: ${fuelGauge(victimData.fuel)}`
                )],
            });
        }

        // Bust path
        thiefData.wallet = Math.max(0, (thiefData.wallet || 0) - FINE);
        thiefData.jailedUntil = now + JAIL_TIME;
        await setEconomyData(client, guildId, thief.id, thiefData);

        return await InteractionHelper.safeEditReply(interaction, {
            embeds: [errorEmbed(
                '🚓 Caught Siphoning',
                `**${victim.username}** spotted you with the jerry can. LSPD rolled up — ` +
                `fined **$${FINE.toLocaleString()}** and jailed for 45 minutes.`
            )],
        });
    }, { command: 'siphon' }),
};
