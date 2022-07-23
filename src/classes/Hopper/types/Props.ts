import { JukebotInteraction } from '../../../types/JukebotInteraction';
import { ValidSearch } from '../../../types/SearchTypes';

export interface HopperProps<T extends ValidSearch> {
    interaction: JukebotInteraction;
    search: T;
    searchTerm: string;
    maxItems: number | undefined;
}
