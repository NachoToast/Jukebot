import { Command, CommandParams } from '../../classes/template/Command';

export class Fix extends Command {
    public name = `fix`;
    public description = `Fixes Jukebox if it's stuck in a voice channel or something`;
    public async execute({ interaction, jukebot }: CommandParams): Promise<void> {
        const jukebox = jukebot.getJukebox(interaction.guildId);

        if (jukebox === undefined || jukebox.inventory.length === 0) {
            await interaction.reply({ content: `Fix not necessary, not currently active in this server` });
            return;
        }

        jukebox.destroy();
        await interaction.reply({ content: `Fix attempted, please contact NachoToast if problems persist` });
    }
}
