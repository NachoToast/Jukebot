import { VoiceBasedChannel } from 'discord.js';
import { JukebotInteraction } from '../../../types/JukebotInteraction';
import { AnyValidSearch } from '../../../types/Searches';

export interface JukeboxProps {
    interaction: JukebotInteraction;
    voiceChannel: VoiceBasedChannel;
    search: AnyValidSearch;
    searchTerm: string;
}
