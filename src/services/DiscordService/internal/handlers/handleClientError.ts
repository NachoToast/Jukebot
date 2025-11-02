import { handleError } from '../../handleError';

export function handleClientError(error: Error): void {
    handleError(error);
}
