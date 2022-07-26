import { ValidSearchSources } from '../../../types/Searches';
import { HopperItemError, HopperUnknownError } from '../Errors';

export type HopperSingleErrorResponse<T extends ValidSearchSources> = HopperItemError<T> | HopperUnknownError;
