import { InteractionReplyOptions } from 'discord.js';
import { Jukebot } from '../../classes/Jukebot';
import { JukebotInteraction } from '../../types/JukebotInteraction';
import { Status } from './status';

describe(`/status`, () => {
    let output: InteractionReplyOptions = {};

    const reply = (newOutput: InteractionReplyOptions) => (output = newOutput);

    const jukebot = { client: { ws: { ping: 123 } }, getJukebox: () => undefined } as unknown as Jukebot;
    const interaction = { createdTimestamp: Date.now() - 1000, reply } as unknown as JukebotInteraction;

    const params = { jukebot, interaction };

    const status = new Status();

    it(`should give accurate client latency`, async () => {
        await status.execute(params);
        expect(output?.content?.includes(`123`));
    });

    it(`should give API latency fairly accurately`, async () => {
        await status.execute(params);
        expect(output?.content?.match(/10[0-9]{2}/g));
    });

    it(`should include package version`, async () => {
        await status.execute(params);
        expect(output?.content?.includes(process.env.npm_version ?? `Unknown`));
    });
});
