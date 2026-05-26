import { SlashCommandBuilder, PermissionFlagsBits, ChannelType } from 'discord.js';
import { readFile } from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { errorEmbed, successEmbed } from '../../utils/embeds.js';
import { withErrorHandling, createError, ErrorTypes } from '../../utils/errorHandler.js';
import { InteractionHelper } from '../../utils/interactionHelper.js';

const __filename = fileURLToPath(import.meta.url);
const BLUEPRINT_PATH = path.resolve(path.dirname(__filename), '../../../T-MO_BLUEPRINT.md');

// Discord hard cap is 2000 chars per message. Use 1900 for safety.
const CHUNK_SIZE = 1900;

function chunkMarkdown(text) {
    const lines = text.split('\n');
    const chunks = [];
    let buf = '';
    for (const line of lines) {
        if ((buf + '\n' + line).length > CHUNK_SIZE) {
            if (buf) chunks.push(buf);
            buf = line;
        } else {
            buf = buf ? `${buf}\n${line}` : line;
        }
    }
    if (buf) chunks.push(buf);
    return chunks;
}

export default {
    data: new SlashCommandBuilder()
        .setName('postblueprint')
        .setDescription('(Admin) Post the T-MO admin blueprint to a channel')
        .addChannelOption(o => o
            .setName('channel')
            .setDescription('Channel to post the blueprint in')
            .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)
            .setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

    execute: withErrorHandling(async (interaction /*, config, client */) => {
        await InteractionHelper.safeDefer(interaction, { ephemeral: true });

        if (!interaction.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
            throw createError('Forbidden', ErrorTypes.PERMISSION,
                'You need **Manage Server** to use this command.');
        }

        const channel = interaction.options.getChannel('channel');
        if (!channel?.isTextBased?.()) {
            throw createError('Bad channel', ErrorTypes.VALIDATION,
                'Pick a text or announcement channel.');
        }

        let markdown;
        try {
            markdown = await readFile(BLUEPRINT_PATH, 'utf8');
        } catch {
            throw createError('Missing blueprint', ErrorTypes.NOT_FOUND,
                'T-MO_BLUEPRINT.md not found in the repo root.');
        }

        const chunks = chunkMarkdown(markdown);
        for (const chunk of chunks) {
            await channel.send({ content: chunk });
        }

        await InteractionHelper.safeEditReply(interaction, {
            embeds: [successEmbed('📘 Blueprint posted',
                `Sent **${chunks.length}** message${chunks.length === 1 ? '' : 's'} to ${channel}.`)],
        });
    }, { command: 'postblueprint' }),
};
