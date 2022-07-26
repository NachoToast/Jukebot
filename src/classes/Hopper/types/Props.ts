import { JukebotInteraction } from '../../../types/JukebotInteraction';
import { MapSearchSourceToTypes, ValidSearch, ValidSearchSources } from '../../../types/Searches';

export interface HopperProps<T extends ValidSearchSources, K extends MapSearchSourceToTypes<T>> {
    interaction: JukebotInteraction;
    search: ValidSearch<T, K>;
    searchTerm: string;
    maxItems: number | undefined;
}
