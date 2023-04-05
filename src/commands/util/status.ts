import dayjs, { extend } from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import { JukebotGlobals } from '../../global';
import { Colours, Command } from '../../types';

extend(relativeTime);

function pingHint(ping: number): string {
    if (ping < 500) return 'good';
    if (ping < 1_000) return 'ok';
    if (ping < 2_000) return 'bad';
    if (ping < 3_000) return 'very bad';
    return 'oh god';
}

export const statusCommand: Command = {
    name: 'status',
    description: "Sends information about the bot's status",
    execute: async function ({ client, interaction }): Promise<void> {
        const ping = Math.abs(Date.now() - interaction.createdTimestamp);
        const apiLatency = Math.round(client.ws.ping);

        const uptime = dayjs(client.readyAt).fromNow(true);

        const utilizedMemory = process.memoryUsage().heapUsed / 1024 ** 2;

        const output: string[] = [
            `${Colours.Bright}Jukebot ${Colours.Reset}${Colours.FgRed}${JukebotGlobals.version}${
                Colours.Reset
            } ${'amongus'}`,
            `Uptime: ${Colours.FgGreen}${uptime[0].toUpperCase() + uptime.slice(1)}${Colours.Reset} ${
                Colours.FgBlack
            }${new Date(client.readyAt).toLocaleString('en-NZ')} NZT${Colours.Reset}`,
            `Latency: ${Colours.FgYellow}${ping}ms (${pingHint(ping)})${Colours.Reset} API Latency: ${
                Colours.FgBlue
            }${apiLatency}ms${Colours.Reset}`,
            `Memory: ${Colours.FgCyan}${Math.ceil(utilizedMemory)}${Colours.Reset} MB`,
        ];

        await interaction.reply({
            content: '> ```ansi\n> ' + output.join('\n> ') + '\n> ```',
        });
    },
};
