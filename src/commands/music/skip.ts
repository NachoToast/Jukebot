import { SlashCommandBuilder } from 'discord.js';
import { StatusTiers } from '../../classes/Jukebox/types';
import { Command, CommandParams } from '../../classes/template/Command';

export class Skip extends Command {
    public name = `skip`;
    public description = `Skip the current song`;

    public build(): SlashCommandBuilder {
        const cmd = super.build();

        cmd.addIntegerOption((option) =>
            option.setName(`to`).setDescription(`Skip to the song at this position in the queue`),
        );

        return cmd;
    }

    public async execute({ interaction, jukebot }: CommandParams): Promise<void> {
        const jukebox = jukebot.getJukebox(interaction.guildId);

        if (jukebox === undefined || jukebox.status.tier !== StatusTiers.Active) {
            await interaction.reply({ content: `Not currently playing anything` });
            return;
        }

        const newPosition = interaction.options.get(`to`, false)?.value;
        if (newPosition !== undefined) {
            if (typeof newPosition !== `number` || newPosition < 1) {
                await interaction.reply({ content: `Please specify a valid queue position to skip to` });
                return;
            }

            if (newPosition > jukebox.inventory.length) {
                await interaction.reply({
                    content: `Invalid position, can't be greater than ${jukebox.inventory.length}`,
                });
                return;
            }

            jukebox.inventory.splice(0, newPosition - 1);
        }

        await interaction.reply({
            content: `Skipping${
                newPosition !== undefined ? ` ${newPosition} song${newPosition !== 1 ? `s` : ``}` : ``
            }...`,
        });

        const res = await jukebox.playNextInQueue(interaction);

        await interaction.editReply(res);
    }
}
