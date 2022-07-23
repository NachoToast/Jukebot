import { Snowflake } from 'discord.js';

export interface JsonMusicDisc {
    addedAt: number;
    addedBy: { id: Snowflake; name: string };
    channel: { id: Snowflake; name: string };
    url: string;
    title: string;
    durationString: string;
    prepared: boolean;
}
