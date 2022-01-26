import { Interaction } from 'discord.js';
import { Client } from '../../client/Client';
import { CommandParams } from '../../types/Command';
import { Ping } from './ping';

describe('/ping', () => {
    const reply = jest.fn();

    const client = { ws: { ping: 123 } } as Client;
    const interaction = { createdTimestamp: Date.now() - 1000, reply } as unknown as Interaction;

    const params = { client, interaction } as CommandParams;

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
