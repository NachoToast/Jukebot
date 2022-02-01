import { SlashCommandBuilder } from '@discordjs/builders';
import Command, { CommandParams } from '../../types/Command';

export class Ping extends Command {
    public name = 'ping';
    public description = 'Replies with Pongers!';
    public allowNoGuild = true;
    public build(): SlashCommandBuilder {
        return new SlashCommandBuilder().setName(this.name).setDescription(this.description);
    }

    public async execute({ jukebot, interaction }: CommandParams): Promise<void> {
        await interaction.reply(
            `Pongers!\nMy latency: ${Math.abs(Date.now() - interaction.createdTimestamp)}ms\nAPI Latency: ${Math.round(
                jukebot.client.ws.ping,
            )}ms`,
        );
    }
}

export default new Ping();
