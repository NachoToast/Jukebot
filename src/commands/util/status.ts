import moment from 'moment';
import { StatusTiers } from '../../classes/Jukebox/types';
import { Command, CommandParams } from '../../classes/template/Command';
import { getVersion } from '../../functions/getVersion';
import { Colours } from '../../types/Colours';

export class Status extends Command {
    public name = `status`;
    public description = `Check my status`;

    public async execute({ jukebot, interaction }: CommandParams): Promise<void> {
        const ping = Math.abs(Date.now() - interaction.createdTimestamp);
        const apiLatency = Math.round(jukebot.client.ws.ping);

        const uptime = moment(jukebot.client.readyAt).fromNow(true);

        const utilizedMemory = process.memoryUsage().heapUsed / 1024 ** 2;

        const output: string[] = [
            `${Colours.Bright}Jukebot ${Colours.Reset}${Colours.FgRed}${getVersion()}${Colours.Reset}`,
            `Uptime: ${Colours.FgGreen}${uptime[0].toUpperCase() + uptime.slice(1)}${Colours.Reset} ${
                Colours.FgBlack
            }${new Date(jukebot.client.readyAt).toLocaleString(`en-NZ`)} NZT${Colours.Reset}`,
            `Latency: ${Colours.FgYellow}${ping}ms (${Status.pingHint(ping)})${Colours.Reset} API Latency: ${
                Colours.FgBlue
            }${apiLatency}ms${Colours.Reset}`,
            `Memory: ${Colours.FgCyan}${Math.ceil(utilizedMemory)}${Colours.Reset} MB`,
        ];

        const jukebox = jukebot.getJukebox(interaction.guildId);

        if (jukebox) {
            output.push(
                `Status: ${Colours.FgMagenta}${
                    jukebox[`_status`].tier === StatusTiers.Active
                        ? `Active`
                        : jukebox[`_status`].tier === StatusTiers.Idle
                        ? `Idle`
                        : `Inactive`
                }${Colours.Reset}`,
            );
        }

        await interaction.reply({
            content: `> \`\`\`ansi\n> ` + output.join(`\n> `) + `\n> \`\`\``,
        });
    }

    private static pingHint(ping: number): string {
        if (ping < 500) return `good`;
        if (ping < 1000) return `ok`;
        if (ping < 2000) return `bad`;
        if (ping < 3000) return `very bad`;
        return `oh god`;
    }
}
