import { Client, MessageEmbed } from 'discord.js';
import { request, RequestOptions } from 'https';
import moment from 'moment';
import { Jukebot } from './Client';
import { getIdealChannel } from '../helpers/getIdealChannel';
import Colours from '../types/Colours';
import { Release } from '../types/Release';

/** Handles dispatching global announcements. */
export abstract class Announcer {
    /**
     * Dispatches an announcement with information about the latest GitHub release.
     *
     * Will only send an announcement if:
     *
     * - The release was published within the configured
     * {@link Jukebot.config.announcementSystem.dontAnnounceOlderThan recency} threshold.
     *
     * - The release is not a pre-release.
     */
    public static async init(client: Client<true>): Promise<void> {
        let release: Release;

        // get latest release
        try {
            const gitHubReleases = await Announcer.getRequest();

            const latestRelease = gitHubReleases.filter((release) => !release.prerelease).shift();
            if (!latestRelease) {
                console.log('[Announcer] no GitHub releases found');
                return;
            }

            const releasedAt = latestRelease?.published_at;
            if (!releasedAt || latestRelease?.draft) {
                console.log(
                    `[Announcer] latest release (${Colours.FgMagenta}${latestRelease.name}${Colours.Reset}) hasn't been published yet`,
                );
                return;
            }

            const minsSinceRelease = Math.floor((Date.now() - new Date(releasedAt).getTime()) / (1000 * 60));
            const timeAgoThreshold = Jukebot.config.announcementSystem.dontAnnounceOlderThan;

            if (timeAgoThreshold && minsSinceRelease > timeAgoThreshold) {
                console.log(
                    `[Announcer] latest release (${Colours.FgMagenta}${latestRelease.name}${
                        Colours.Reset
                    }) was published ${moment(releasedAt).fromNow()}, so not announcing`,
                );
                return;
            }

            release = latestRelease;
        } catch (error) {
            console.log('[Announcer] failed to get latest GitHub release');
            return;
        }

        // construct message
        const embed = new MessageEmbed()
            .setAuthor({
                name: `Updated to Version ${release.tag_name}`,
                iconURL: 'https://github.githubassets.com/images/modules/logos_page/GitHub-Mark.png',
            })
            // .setTitle(release.name)
            .setThumbnail(client.user.avatarURL() ?? '')
            .setDescription(release.body)
            .setURL(release.html_url)
            .setFooter({
                text: `${release.author.login} (${moment(release.published_at).fromNow()})`,
                iconURL: release.author.avatar_url,
            })
            .setColor(Jukebot.config.colourTheme);

        // send message
        const guilds = await client.guilds.fetch();

        let successes = 0;
        let errors = 0;
        let noLinks = 0;
        const total = guilds.size;

        for (const [, authGuild] of guilds) {
            const guild = await authGuild.fetch();
            if (guild.me === null) continue; // bot (somehow) not in this guild
            const idealChannel = await getIdealChannel(guild);
            if (!idealChannel) continue; // no text channel found to send embed in
            if (idealChannel.permissionsFor(guild.me).has('EMBED_LINKS') || !false) {
                // embed links perm wasn't required on earlier versions of Jukebot
                noLinks++;
                await idealChannel.send({
                    content: `Tried to send a message embed about my latest update (${release.tag_name}), but I don't have the \`Embed Links\` permission. Please give my role this permission, or reinvite me to the server using the button on my profile.`,
                });
                continue;
            }
            try {
                await idealChannel.send({ embeds: [embed] });
                successes++;
            } catch (error) {
                console.log(
                    `[Announcer] failed to announce to guild ${Colours.FgMagenta}${guild.name}${Colours.Reset}`,
                    error,
                );
                errors++;
            }
        }

        // log results
        console.log(
            `[Announcer] Announced release ${Colours.FgMagenta}${release.tag_name}${Colours.Reset} to ${
                Colours.FgGreen
            }${successes}${Colours.Reset} out of ${Colours.FgMagenta}${total}${Colours.Reset} guilds (${
                Colours.FgRed
            }${errors}${Colours.Reset} error${errors !== 1 ? 's' : ''}, ${Colours.FgBlue}${noLinks}${
                Colours.Reset
            } missing embed links perms)`,
        );
    }

    /**
     * Sends a GET request to Jukebot's GitHub repository.
     *
     * @returns {Promise<Release[]>} An array of release objects.
     *
     * @throws Throws an error if the GET request failed. It may fail if there are no releases.
     */
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
                        reject('Invalid shape');
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
