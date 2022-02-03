import { SlashCommandBuilder } from '@discordjs/builders';
import moment from 'moment';
import Command, { CommandParams } from '../../types/Command';

export class Ping extends Command {
    public name = 'ping';
    public description = 'Check my status';
    public allowNoGuild = true;
    public build(): SlashCommandBuilder {
        return new SlashCommandBuilder().setName(this.name).setDescription(this.description);
    }

    public async execute({ jukebot, interaction }: CommandParams): Promise<void> {
        const ping = Math.abs(Date.now() - interaction.createdTimestamp);
        const apiLatency = Math.round(jukebot.client.ws.ping);

        const status: string = ping < 500 ? 'good' : ping < 1000 ? 'ok' : 'bad';
        const uptime = moment(jukebot.client.readyAt).fromNow(true);

        await interaction.reply({
            content: `Pongers!\nLatency: ${ping}ms (${status})\nAPI Latency: ${apiLatency}ms\nUptime: ${uptime}`,
        });
    }
}

export default new Ping();
