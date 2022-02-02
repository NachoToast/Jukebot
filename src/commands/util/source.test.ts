import { Interaction, MessageActionRow, MessageButton } from 'discord.js';
import { Jukebot } from '../../classes/Client';
import { CommandParams } from '../../types/Command';
import Config from '../../types/Config';
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

    const reply = (newOutput: Output) => (output = newOutput);
    const interaction = { reply } as unknown as Interaction;
    const params = { interaction } as CommandParams;

    const source = new Source();

    it('should make a button with the right link', async () => {
        const sourceCode = 'example.com';

        const mockSourceCode = jest.fn().mockReturnValue({ sourceCode });
        Jukebot.config = mockSourceCode() as Config;
        await source.execute(params);

        const button = output.components[0].components[0];

        // we can't use the MessageComponentTypes enum in tests,
        // so this is the next best thing
        expect(button.type).toBe(new MessageButton().type);

        expect((button as MessageButton).url).toEqual(sourceCode);
    });
});
