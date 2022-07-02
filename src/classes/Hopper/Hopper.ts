import { JukebotInteraction } from '../../types/JukebotInteraction';
import { ValidSearch } from '../../types/SearchTypes';
import { Jukebot } from '../Jukebot';

/** Handles fetching of results from a query string. */
export class Hopper {
    public readonly bot: Jukebot;
    public readonly interaction: JukebotInteraction;
    public readonly search: ValidSearch;

    public readonly results: object | null = null;

    public constructor(bot: Jukebot, interaction: JukebotInteraction, search: ValidSearch) {
        this.bot = bot;
        this.interaction = interaction;
        this.search = search;
    }

    // public async activate(): Promise<Hopper & { results: object }> {
    //     //
    // }

    // private async handleYouTubeVideoURL(s: ValidYouTubeSearch & { type: YouTubeSubtypes.Video }): Promise<MusicDisc {

    // }
}
