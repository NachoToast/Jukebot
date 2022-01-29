import { Interaction } from 'discord.js';
import { Jukebot } from '../../client/Client';
import { CommandParams } from '../../types/Command';
import { Ping } from './ping';

describe('/ping', () => {
    const reply = jest.fn();

    const jukebot = { client: { ws: { ping: 123 } } } as Jukebot;
    const interaction = { createdTimestamp: Date.now() - 1000, reply } as unknown as Interaction;

    const params = { jukebot, interaction } as CommandParams;

    const ping = new Ping();

    it('should give accurate client latency', async () => {
        await ping.execute(params);
        expect(reply).toBeCalledWith(expect.stringContaining('123'));
    });

    it('should give API latency fairly accurately', async () => {
        await ping.execute(params);
        expect(reply).toBeCalledWith(expect.stringMatching(/[0-9]{4}/));
    });
});
