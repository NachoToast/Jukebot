import { request, RequestOptions } from 'https';
import { Loggers } from '../../global/Loggers';
import { Release } from './types';
import { getVersion } from '../../functions/getVersion';

/**
 * Observes the GitHub releases of Jukebot to determine information like:
 *
 * - Latest release.
 * - Current release description.
 */
export class ReleaseObserver {
    /** Releases indexed by tag name. */
    public releases: Record<string, Release> = {};

    /** Tag names in order of release date. */
    public tags: string[] = [];

    /** Set of tag names. */
    public tagSet: Set<string> = new Set();

    public currentVersionTip = `(Still Loading)`;

    public constructor() {
        //
        this.getReleases();

        // get new releases every day
        setInterval(() => this.getReleases(), 1000 * 60 * 60 * 24);
    }

    private async getReleases(): Promise<void> {
        const options: RequestOptions = {
            hostname: `api.github.com`,
            port: 443,
            path: `/repos/NachoToast/Jukebot/releases`,
            method: `GET`,
            headers: {
                'user-agent': `node.js`,
            },
        };

        let releases: Release[];

        try {
            releases = await new Promise<Release[]>((resolve, reject) => {
                const req = request(options, (res) => {
                    let output = ``;
                    res.on(`data`, (d) => (output += d));
                    res.on(`close`, () => {
                        try {
                            resolve(JSON.parse(output) as Release[]);
                        } catch (error) {
                            Loggers.error.log(`ReleaseObserver.getReleases: Unable to parse JSON response`, error);
                            reject();
                        }
                    });
                });

                req.on(`error`, (error) => {
                    Loggers.error.log(`ReleaseObserver.getReleases: Request error`, error);
                    reject();
                });

                req.end();
            });
        } catch (error) {
            return;
        }

        this.tags = [];
        this.tagSet = new Set();
        this.releases = {};

        for (const release of releases) {
            this.tags.push(release.tag_name);
            this.tagSet.add(release.tag_name);
            this.releases[release.tag_name] = release;
        }

        // Loggers.info.log(
        //     `[ReleaseObserver] Registered ${this._tags.length} Release Tags (${this._tags.at(-1)} to ${this._tags.at(
        //         0,
        //     )})`,
        // );

        const currentVersion = getVersion();
        const existingIndex = this.tags.indexOf(currentVersion);
        if (existingIndex === -1) {
            this.currentVersionTip = `(Untracked Version)`;
        } else if (existingIndex !== 0) {
            this.currentVersionTip = `(${existingIndex} Version${existingIndex !== 1 ? `s` : ``} Behind)`;
        } else {
            this.currentVersionTip = `(Latest)`;
        }
    }
}
