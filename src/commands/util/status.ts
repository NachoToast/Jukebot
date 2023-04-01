import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import { Colours } from '../../types/Colours';
import { CommandParams } from '../../types/CommandParams';
import { Command } from '../Command';

dayjs.extend(relativeTime);

export class Status extends Command {
    public readonly name = 'status';
    public readonly description = 'Check my status';

    public override async execute({ client, clientVersion, interaction }: CommandParams): Promise<void> {
        const ping = Math.abs(Date.now() - interaction.createdTimestamp);
        const apiLatency = Math.round(client.ws.ping);

        const uptime = dayjs(client.readyAt).fromNow(true);

        const utilizedMemory = process.memoryUsage().heapUsed / 1024 ** 2;

        const output: string[] = [
            `${Colours.Bright}Jukebot ${Colours.Reset}${Colours.FgRed}${clientVersion}${Colours.Reset} ${'amongus'}`,
            `Uptime: ${Colours.FgGreen}${uptime[0].toUpperCase() + uptime.slice(1)}${Colours.Reset} ${
                Colours.FgBlack
            }${new Date(client.readyAt).toLocaleString('en-NZ')} NZT${Colours.Reset}`,
            `Latency: ${Colours.FgYellow}${ping}ms (${Status.pingHint(ping)})${Colours.Reset} API Latency: ${
                Colours.FgBlue
            }${apiLatency}ms${Colours.Reset}`,
            `Memory: ${Colours.FgCyan}${Math.ceil(utilizedMemory)}${Colours.Reset} MB`,
        ];

        await interaction.reply({
            content: '> ```ansi\n> ' + output.join('\n> ') + '\n> ```',
        });
    }

    public override build() {
        return super.build().setDMPermission(true);
    }

    private static pingHint(ping: number): string {
        if (ping < 500) return 'good';
        if (ping < 1000) return 'ok';
        if (ping < 2000) return 'bad';
        if (ping < 3000) return 'very bad';
        return 'oh god';
    }
}
