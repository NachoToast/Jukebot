import { VoiceBasedChannel } from 'discord.js';
import { JukebotInteraction } from '../../../types/JukebotInteraction';
import { ValidSearch } from '../../../types/SearchTypes';

export interface JukeboxProps {
    interaction: JukebotInteraction;
    voiceChannel: VoiceBasedChannel;
    search: ValidSearch;
    searchTerm: string;
}
