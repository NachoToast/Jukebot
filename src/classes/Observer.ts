import { RequestOptions, request } from 'https';
import { JukebotGlobals } from '../global';
import { GithubRelease } from '../types';
import { withPossiblePlural } from '../util';

/** Routinely fetches the latest Github release of Jukebot. */
export class Observer {
    /** Releases indexed by tag name. */
    public releases: Record<string, GithubRelease> = {};

    /** Tag names in order of release date, where the first item is the latest tag. */
    public tags: string[] = [];

    /** Set of tag names. */
    public tagSet: Set<string> = new Set();

    public currentVersionTip = '(Still Loading)';

    public constructor() {
        this.getReleases();

        // get new releases every day
        setInterval(() => this.getReleases(), 1_000 * 60 * 60 * 24);
    }

    private async getReleases(): Promise<void> {
        const options: RequestOptions = {
            hostname: 'api.github.com',
            port: 443,
            path: '/repos/NachoToast/Jukebot/releases',
            method: 'GET',
            headers: {
                'user-agent': 'node.js',
            },
        };

        let releases: GithubRelease[] = [];

        try {
            releases = await new Promise<GithubRelease[]>((resolve, reject) => {
                const req = request(options, (res) => {
                    let output = '';
                    res.on('data', (d) => (output += d));
                    res.on('close', () => {
                        try {
                            resolve(JSON.parse(output));
                        } catch (error) {
                            reject(error);
                        }
                    });
                });

                req.on('error', (error) => reject(error));

                req.end();
            });
        } catch (error) {
            console.log(error);
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

        const existingIndex = this.tags.indexOf(JukebotGlobals.version);
        if (existingIndex === -1) {
            this.currentVersionTip = '(Untracked Version)';
        } else if (existingIndex !== 0) {
            this.currentVersionTip = `(${withPossiblePlural(existingIndex, 'Version')} Behind)`;
        } else {
            this.currentVersionTip = '(Latest)';
        }
    }
}
