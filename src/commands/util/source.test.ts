import { Interaction, MessageActionRow, MessageButton } from 'discord.js';
import { Client } from '../../client/Client';
import { CommandParams } from '../../types/Command';
import { Source } from './source';

interface Output {
    content: string;
    components: MessageActionRow[];
    ephemeral: boolean;
}

describe('/source', () => {
    let output: Output = {
        content: '',
        components: [],
        ephemeral: false,
    };

    const reply = (args: Output) => (output = { ...output, ...args });

    const client = { config: { sourceCode: 'https://example.com' } } as Client;
    const interaction = { reply } as unknown as Interaction;

    const params = { client, interaction } as CommandParams;

    const source = new Source();

    it('should make a button with the right link', async () => {
        await source.execute(params);

        const button = output.components[0].components[0];
        console.log(output.components[0].components[0].type);

        // we can't use the MessageComponentTypes enum in tests,
        // so this is the next best thing
        expect(button.type).toEqual(new MessageButton().type);

        expect((button as MessageButton).url).toEqual(client.config.sourceCode);
    });
});
