import { Snowflake } from 'discord.js';

/** Key information about a Music Disc in dictionary form. */
export interface JsonMusicDisc {
    addedAt: number;
    addedBy: { id: Snowflake; name: string };
    channel: { id: Snowflake; name: string };
    url: string;
    title: string;
    durationString: string;
    prepared: boolean;
}
