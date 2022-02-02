import { GuildManager, MessageEmbed } from 'discord.js';
import { request, RequestOptions } from 'https';
import moment from 'moment';
import { Jukebot } from './Client';
import { getIdealChannel } from '../helpers/getIdealChannel';
import Colours from '../types/Colours';
import { Release } from '../types/Release';

/** The announcer handles dispatching global announcements. */
export class Announcer {
    private _guilds: GuildManager;

    public constructor(guilds: GuildManager) {
        this._guilds = guilds;
        this.init();
    }

    /** Dispatches an announcement once the bot starts up,
     * giving information about it's latest release.'
     *
     * Will only send an announcement if:
     * - The configured `sourceCode` is unmodified.
     * - The latest release meets the configured `releaseRecentThreshold`.
     */
    private async init(): Promise<void> {
        if (Jukebot.config.sourceCode !== 'https://github.com/NachoToast/Jukebot') return;

        let latestRelease: Release;

        try {
            const releases = await Announcer.getRequest();
            const latest = releases.shift();
            if (!latest) {
                console.log('[Announcer] no GitHub releases found');
                return;
            }
            const latestTime = latest?.published_at;
            if (!latestTime || latest?.draft) {
                console.log(
                    `[Announcer] latest release (${Colours.FgMagenta}${latest.name}${Colours.Reset}) hasn't been published yet`,
                );
                return;
            }

            const minsSinceRelease = 60 * Math.floor((Date.now() - new Date(latestTime).getTime()) / 1000);

            if (minsSinceRelease > Jukebot.config.announcementSystem.dontAnnounceOlderThan) {
                console.log(
                    `[Announcer] latest release (${Colours.FgMagenta}${latest.name}${
                        Colours.Reset
                    }) was published ${moment(latestTime).fromNow()}, so not announcing`,
                );
                return;
            }
            latestRelease = latest;
        } catch (error) {
            console.log('[Announcer] failed to get latest GitHub release');
            return;
        }

        const embed = new MessageEmbed()
            .setAuthor({
                name: `Update ${latestRelease.tag_name}`,
                iconURL: 'https://github.githubassets.com/images/modules/logos_page/GitHub-Mark.png',
            })
            .setTitle(latestRelease.name)
            .setDescription(latestRelease.body)
            .setURL(latestRelease.html_url)
            .setFooter({
                text: `Published by ${latestRelease.author.login} ${moment(latestRelease.published_at).fromNow()}`,
                iconURL: latestRelease.author.avatar_url,
            })
            .setColor(Jukebot.config.colourTheme);

        let successfulAnnouncements = 0;
        let erroredAnnouncements = 0;

        const guilds = await this._guilds.fetch();

        for (const [, authGuild] of guilds) {
            const guild = await authGuild.fetch();
            const idealChannel = await getIdealChannel(guild);
            if (!idealChannel) continue;
            try {
                await idealChannel.send({ embeds: [embed] });
                successfulAnnouncements++;
            } catch (error) {
                console.log(
                    `[Announcer] failed to announce to guild ${Colours.FgMagenta}${guild.name}${Colours.Reset}`,
                );
                erroredAnnouncements++;
            }
        }

        console.log(
            `[Announcer] Announced release ${Colours.FgMagenta}${latestRelease.tag_name}${Colours.Reset} to ${Colours.FgGreen}${successfulAnnouncements}${Colours.Reset} out of ${Colours.FgMagenta}${guilds.size}${Colours.Reset} guilds (${Colours.FgRed}${erroredAnnouncements}${Colours.Reset} errors)`,
        );
    }

    private static getRequest(): Promise<Release[]> {
        return new Promise<Release[]>((resolve, reject) => {
            const options: RequestOptions = {
                hostname: 'api.github.com',
                port: 443,
                path: '/repos/NachoToast/Jukebot/releases',
                method: 'GET',
                headers: {
                    'user-agent': 'node.js',
                },
            };
            let output = '';

            const req = request(options, (res) => {
                res.on('data', (d) => {
                    output += d;
                });

                res.on('close', () => {
                    try {
                        resolve(JSON.parse(output) as Release[]);
                    } catch (error) {
                        reject('Invalid shapee');
                    }
                });
            });

            req.on('error', (error) => {
                console.log(error);
            });

            req.end();
        });
    }
}
