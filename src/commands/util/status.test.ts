import { Interaction, InteractionReplyOptions } from 'discord.js';
import { Jukebot } from '../../classes/Client';
import { CommandParams } from '../../types/Command';
import { Status } from './status';

describe('/status', () => {
    let output: InteractionReplyOptions = {};

    const reply = (newOutput: InteractionReplyOptions) => (output = newOutput);

    const jukebot = { client: { ws: { ping: 123 } }, getJukebox: () => undefined } as unknown as Jukebot;
    const interaction = { createdTimestamp: Date.now() - 1000, reply } as unknown as Interaction;

    const params = { jukebot, interaction } as CommandParams;

    const status = new Status();

    it('should give accurate client latency', async () => {
        await status.execute(params);
        expect(output?.content?.includes('123'));
    });

    it('should give API latency fairly accurately', async () => {
        await status.execute(params);
        expect(output?.content?.match(/[0-9]{4}/g));
    });

    it('should include package version', async () => {
        await status.execute(params);
        expect(output?.content?.includes(process.env.npm_version ?? 'Unknown'));
    });
});
