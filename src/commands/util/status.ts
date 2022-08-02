import moment from 'moment';
import { JukeboxStatus, StatusTiers } from '../../classes/Jukebox/types';
import { Command, CommandParams } from '../../classes/template/Command';
import { getVersion } from '../../functions/getVersion';
import { numericalToString } from '../../functions/timeConverters';
import { Config } from '../../global/Config';
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
            `${Colours.Bright}Jukebot ${Colours.Reset}${Colours.FgRed}${getVersion()}${Colours.Reset} ${
                jukebot.releaseObserver.currentVersionTip
            }`,
            `Uptime: ${Colours.FgGreen}${uptime[0].toUpperCase() + uptime.slice(1)}${Colours.Reset} ${
                Colours.FgBlack
            }${new Date(jukebot.client.readyAt).toLocaleString(`en-NZ`)} NZT${Colours.Reset}`,
            `Latency: ${Colours.FgYellow}${ping}ms (${Status.pingHint(ping)})${Colours.Reset} API Latency: ${
                Colours.FgBlue
            }${apiLatency}ms${Colours.Reset}`,
            `Memory: ${Colours.FgCyan}${Math.ceil(utilizedMemory)}${Colours.Reset} MB`,
        ];

        const jukebox = jukebot.getJukebox(interaction.guildId);
        output.push(
            `Server Status: ${Colours.FgMagenta}${
                jukebox
                    ? `${jukebox.status.tier[0].toUpperCase() + jukebox.status.tier.slice(1)} ${Status.statusTimeLeft(
                          jukebox.status,
                          jukebox.lastStatusChange,
                      )}`
                    : `n/a`
            }${Colours.Reset}`,
        );

        const jukeboxData = jukebot.getNumJukeboxes();
        output.push(
            `Servers: ${jukeboxData.active} Active | ${jukeboxData.idle} Idle | ${jukeboxData.inactive} Inactive | ${jukebot.client.guilds.cache.size} Total`,
        );

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

    /** Returns how long until the status of a Jukebox will change. */
    private static statusTimeLeft(status: JukeboxStatus, lastStatusChange: number): string {
        let lastsFor: number;

        switch (status.tier) {
            case StatusTiers.Active:
                return `(${numericalToString(Math.floor((Date.now() - lastStatusChange) / 1000))} Elapsed)`;
            case StatusTiers.Idle:
                lastsFor = Config.timeoutThresholds.leaveVoice;
                break;
            case StatusTiers.Inactive:
                lastsFor = Config.timeoutThresholds.clearQueue;
                break;
        }

        if (lastsFor === 0) return `(Forever)`;

        const secondsTillChange = lastsFor - Math.floor((Date.now() - lastStatusChange) / 1000);

        return `(${numericalToString(secondsTillChange)} left)`;
    }
}
