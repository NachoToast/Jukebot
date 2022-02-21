import { SlashCommandBuilder } from '@discordjs/builders';
import moment from 'moment';
import { Jukebot } from '../../classes/Client';
import Command, { CommandParams } from '../../types/Command';

export class Status extends Command {
    public name = 'status';
    public description = 'Check my status';
    public build(): SlashCommandBuilder {
        return new SlashCommandBuilder().setName(this.name).setDescription(this.description);
    }

    private static pingHint(ping: number): string {
        if (ping < 500) return 'good';
        if (ping < 1000) return 'ok';
        if (ping < 2000) return 'bad';
        if (ping < 3000) return 'very bad';
        return 'oh god';
    }

    public async execute({ jukebot, interaction }: CommandParams): Promise<void> {
        const ping = Math.abs(Date.now() - interaction.createdTimestamp);
        const apiLatency = Math.round(jukebot.client.ws.ping);

        const status = Status.pingHint(ping);
        const uptime = moment(jukebot.client.readyAt).fromNow(true);

        const jukebox = jukebot.getJukebox(interaction.guildId);

        const initialContent: string[] = [
            `Running Version: ${Jukebot.version}`,
            `Uptime: ${uptime}`,
            `Latency: ${ping}ms (${status})`,
            `API Latency: ${apiLatency}ms`,
        ];

        if (!jukebox) {
            initialContent.push('Not currently playing anything in the server');
        } else {
            const { player, status, connection } = jukebox.state;
            initialContent.push(
                `Player: **${player}**, connection: **${connection}**, status: **${
                    status.active ? 'active' : 'inactive'
                }**`,
            );
        }

        await interaction.reply({
            content: initialContent.join('\n'),
        });
    }
}

export default new Status();
