import { SearchSources, ValidSearchSources } from './SearchSources';
import { MapSearchSourceToTypes } from './SearchTypes';

interface BaseSearchType {
    valid: boolean;
}

export interface ValidSearch<Source extends ValidSearchSources, SearchType extends MapSearchSourceToTypes<Source>>
    extends BaseSearchType {
    valid: true;
    source: Source;
    type: SearchType;
}

export interface InvalidSearch<T extends SearchSources> extends BaseSearchType {
    valid: false;
    source: T;
    type?: T extends ValidSearchSources ? MapSearchSourceToTypes<T> : undefined;
}

export type AnyValidSearch = ValidSearch<ValidSearchSources, MapSearchSourceToTypes<ValidSearchSources>>;

export type SearchObject = InvalidSearch<SearchSources> | AnyValidSearch;
