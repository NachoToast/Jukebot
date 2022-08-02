import { APIEmbedField, EmbedBuilder } from 'discord.js';
import { StatusTiers } from '../../classes/Jukebox/types';
import { Command, CommandParams } from '../../classes/template/Command';
import { Config } from '../../global/Config';

export class Previous extends Command {
    public name = `previous`;
    public description = `List the recently played songs`;

    public async execute({ interaction, jukebot }: CommandParams): Promise<void> {
        const jukebox = jukebot.getJukebox(interaction.guildId);

        if (jukebox === undefined || jukebox.prevInventory.length === 0) {
            await interaction.reply({ content: `Nothing recently played` });
            return;
        }

        let items = jukebox.prevInventory.getItems();

        if (jukebox.status.tier === StatusTiers.Active) {
            if (jukebox.prevInventory.length === 1) {
                await interaction.reply({ content: `Nothing recently played` });
                return;
            }

            // if jukebox is playing something, the last item in the
            // list is the thing that is currently playing
            // which we don't need to display information on
            items = items.slice(0, -1);
        }

        const fields: APIEmbedField[] = items.map((e, i) => {
            return {
                name: `${i + 1}. ${e.title}`,
                value: `Duration: ${e.durationString}\nRequested By: <@${e.addedBy.id}>\n[YouTube Link](${e.url})`,
                inline: false,
            };
        });

        const embed = new EmbedBuilder()
            .setColor(Config.embedColor)
            .addFields(fields)
            .setDescription(
                `Previous ${items.length} song${
                    items.length !== 1 ? `s` : ``
                }, displayed in the order they were played.`,
            );

        await interaction.reply({ embeds: [embed] });
    }
}
