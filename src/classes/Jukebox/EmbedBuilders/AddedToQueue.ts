import { Config } from '../../../global/Config';
import { AnyValidSearch, MapSearchSourceToTypes, ValidSearchSources } from '../../../types/Searches';
import { HopperResult } from '../../Hopper/types';
import { Jukebox } from '../Jukebox';

/**
 * Makes an "added X to queue" embed, with additional information if multiple items were added.
 *
 * @param {Jukebox} jukebox The Jukebox the items were added to.
 * @param {HopperResult} result Items that were added, and any errors that occured.
 * @param {AnyValidSearch} search Search that got these results.
 *
 */
export function makeAddedToQueueEmbed(
    jukebox: Jukebox,
    result: HopperResult<ValidSearchSources, MapSearchSourceToTypes<ValidSearchSources>>,
    search: AnyValidSearch,
): string {
    if (result.playlistMetadata !== undefined) {
        // playlist specific embed
        if (result.items.length === result.playlistMetadata.playlistSize) {
            // lengths match, so we added all items from the playlist successfully
            return `Added ${result.items.length} songs from **${result.playlistMetadata.playlistName}** to the queue`;
        }
        if (result.errors.length) {
            // some songs weren't added, due to errors or a full queue
            // for now this only shows the errors
            return `Added ${result.items.length} songs from **${
                result.playlistMetadata.playlistName
            }** to the queue\n**${result.errors.length}** Songs had errors:\n${result.errors
                .map((e) => e.toString())
                .join(`\n`)}`;
        }
        if (jukebox.isFull) {
            // some songs weren't added, only due to a full queue
            return `Added ${result.items.length} songs from **${
                result.playlistMetadata.playlistName
            }** to the queue\nSkipped the remaining **${
                result.playlistMetadata.playlistSize - result.items.length
            }** songs since the queue was full (${Config.maxQueueSize} items)`;
        }

        // otherwise not all the items were added, and we don't know why
        jukebox.logError(`Unexpected case on makeAddedToQueue (playlist)`, {
            search,
            full: jukebox.isFull,
            result: {
                items: result.items.map((e) => e.toJSON()),
                errors: result.errors.map((e) => e.toString()),
                meta: result.playlistMetadata,
            },
        });
        return `Unknown error occurred constructing "Added to Queue" message`;
    } else if (result.items.at(0) !== undefined) {
        // single item embed
        return `Added **${result.items[0].title}** (${result.items[0].durationString}) to the queue (ETA: *coming soon*)`;
    } else {
        // no item ???
        jukebox.logError(`Unexpected case on makeAddedToQueue (single)`, {
            search,
            result: {
                items: result.items.map((e) => e.toJSON()),
                errors: result.errors.map((e) => e.toString()),
            },
        });
        return `Unknown error occurred constructing "Added to Queue" message`;
    }
}
