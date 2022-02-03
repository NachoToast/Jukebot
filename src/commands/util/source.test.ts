import { Interaction, InteractionReplyOptions, MessageButton } from 'discord.js';
import { Jukebot } from '../../classes/Client';
import { CommandParams } from '../../types/Command';
import Config from '../../types/Config';
import { Source } from './source';

describe('/source', () => {
    let output: InteractionReplyOptions = {};

    const reply = (newOutput: InteractionReplyOptions) => (output = newOutput);
    const interaction = { reply } as unknown as Interaction;
    const params = { interaction } as CommandParams;

    const source = new Source();

    it('should make a button with the right link', async () => {
        const sourceCode = 'example.com';

        const mockSourceCode = jest.fn().mockReturnValue({ sourceCode });
        Jukebot.config = mockSourceCode() as Config;
        await source.execute(params);

        const button = output?.components?.at(0)?.components?.at(0);

        // we can't use the MessageComponentTypes enum in tests,
        // so this is the next best thing
        expect(button?.type).toBe(new MessageButton().type);

        expect((button as MessageButton)?.url).toEqual(sourceCode);
    });
});
