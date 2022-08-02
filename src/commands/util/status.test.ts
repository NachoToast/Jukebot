import { InteractionReplyOptions } from 'discord.js';
import { Jukebot } from '../../classes/Jukebot';
import { StatusTiers } from '../../classes/Jukebox/types';
import { JukebotInteraction } from '../../types/JukebotInteraction';
import { Status } from './status';

describe(`/status`, () => {
    let output: InteractionReplyOptions = {};

    const reply = (newOutput: InteractionReplyOptions) => (output = newOutput);

    const jukebot = {
        client: { ws: { ping: 123 }, guilds: { cache: { size: 24 } } },
        getJukebox: () => undefined,
        getNumJukeboxes: () => {
            return {
                [StatusTiers.Active]: 1,
                [StatusTiers.Idle]: 2,
                [StatusTiers.Inactive]: 3,
            };
        },
        releaseObserver: { currentVersionTip: `fakeTip` },
    } as unknown as Jukebot;
    const interaction = { createdTimestamp: Date.now() - 1000, reply } as unknown as JukebotInteraction;

    const params = { jukebot, interaction };

    const status = new Status();

    it(`should give accurate client latency`, async () => {
        await status.execute(params);
        expect(output?.content?.includes(`123`));
    });

    it(`should give API latency fairly accurately`, () => {
        expect(output?.content?.match(/10[0-9]{2}/g));
    });

    it(`should include package version`, () => {
        expect(output?.content?.includes(process.env.npm_version ?? `Unknown`));
    });

    it(`should show different statuses of all Jukeboxes`, () => {
        expect(output?.content?.includes(`1 Active`));
        expect(output?.content?.includes(`2 Idle`));
        expect(output?.content?.includes(`3 Inactive`));
    });

    it(`should show number of guilds Jukebot is in`, () => {
        expect(output?.content?.includes(`24`));
    });
});
