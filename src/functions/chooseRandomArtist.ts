export const randomArtists: string[] = [
    `TheFatRat`,
    `Alan Walker`,
    `Dragonforce`,
    `Bones UK`,
    `Camellia`,
    `Feint`,
    `Panda Eyes`,
    `Grabbitz`,
    `Marshmello`,
    `Infected Mushroom`,
    `Saint Punk`,
    `Caravan Palace`,
    `Toby Fox`,
    `Tryhardninja`,
    `BABYMETAL`,
    `Derivakat`,
    `Katy Perry`,
    `YUI`,
    `KASAI HARDCORES`,
    `The Living Tombstone`,
];

let currentSelectedIndex = -1;

/**
 * Chooses a random song artist out of a predetermined set.
 *
 * Will never choose the same artist twice.
 */
export function chooseRandomArtist(): string {
    // make an array of all indexes of the main songs array
    const validIndexes = new Array<number>(randomArtists.length).fill(-1).map((_, i) => i);

    // remove the "active" index
    validIndexes.splice(currentSelectedIndex, 1);

    currentSelectedIndex = validIndexes[Math.floor(Math.random() * validIndexes.length)];

    return randomArtists[currentSelectedIndex];
}
