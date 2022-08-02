import { SlashCommandBuilder } from 'discord.js';
import { Command, CommandParams } from '../../classes/template/Command';

export class Remove extends Command {
    public name = `remove`;
    public description = `Remove a song (or multiple) from the queue`;

    public build(): SlashCommandBuilder {
        const cmd = super.build();

        cmd.addIntegerOption((option) =>
            option.setName(`position`).setDescription(`Position of song to remove`).setRequired(true),
        );

        cmd.addIntegerOption((option) =>
            option.setName(`number`).setDescription(`Number of songs to remove, 1 by default`),
        );

        return cmd;
    }

    public async execute({ jukebot, interaction }: CommandParams): Promise<void> {
        const jukebox = jukebot.getJukebox(interaction.guildId);
        if (jukebox === undefined || jukebox.inventory.length === 0) {
            await interaction.reply({ content: `The queue is empty` });
            return;
        }

        const start = interaction.options.get(`position`, true).value;
        const total = interaction.options.get(`number`, false)?.value ?? 1;

        const maxPos = jukebox.inventory.length;

        if (typeof start !== `number`) {
            await interaction.reply({ content: `Please specify a valid starting position` });
            return;
        }

        if (start < 1 || start > maxPos) {
            await interaction.reply({
                content: `Invalid starting position, must be between 1 and ${maxPos} (inclusive)`,
            });
            return;
        }

        if (typeof total !== `number`) {
            await interaction.reply({ content: `Please specify a valid number of songs to remove` });
            return;
        }

        if (total < 1) {
            await interaction.reply({ content: `Invalid number of songs to remove, must be at least 1` });
            return;
        }

        const spliced = jukebox.inventory.splice(start - 1, total);

        if (spliced.length > 1) {
            await interaction.reply({ content: `Removed **${spliced.length}** songs from the queue` });
        } else if (spliced.length === 1) {
            await interaction.reply({ content: `Removed **${spliced[0].title}** from the queue` });
        } else {
            await interaction.reply({ content: `Nothing removed from the queue (re-check your parameters)` });
        }
    }
}
